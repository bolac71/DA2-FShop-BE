/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductTryonAsset } from './entities/product-tryon-asset.entity';
import { CreateProductDto, CreateProductTryonAssetDto, ImageSearchResultDto, ProductQueryDto, UpdateProductFullDto, UpdateProductFullVariantDto, UpdateProductTryonAssetDto, VoiceSearchResponseDto, VoiceTranscriptionResponseDto } from './dtos';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { ColorsService } from '../colors/colors.service';
import { SizesService } from '../sizes/sizes.service';
import { InventoryTransaction } from '../inventories/entities/inventory-transaction.entity';
import { Inventory } from '../inventories/entities/inventory.entity';
import { InventoryType } from 'src/constants/inventory-type.enum';
import { CouponStatus, CouponType } from 'src/constants';
import { Coupon } from '../coupons/entities';
import { CouponsService } from '../coupons/coupons.service';
import { AiService } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

import { getBestCouponForProduct } from 'src/utils/product.util';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
    @InjectRepository(ProductVariant)
    private productVariantsRepository: Repository<ProductVariant>,
    @InjectRepository(ProductTryonAsset)
    private productTryonAssetsRepository: Repository<ProductTryonAsset>,
    @InjectRepository(InventoryTransaction)
    private inventoryTransactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private dataSource: DataSource,
    private brandsService: BrandsService,
    private categoriesService: CategoriesService,
    private colorsService: ColorsService,
    private sizesService: SizesService,
    private couponsService: CouponsService,
    private aiService: AiService,
    private cloudinaryService: CloudinaryService,
  ) { }


  async create(
    createProductDto: CreateProductDto,
    productImages?: any[],
    variantImagesMap?: Record<number, { imageUrl: string; publicId: string }>,
  ) {
    const { brandId, categoryId, price, variants } = createProductDto;

    // Validate Brand exists
    await this.brandsService.getById(brandId);

    // Validate Category exists
    await this.categoriesService.getById(categoryId);

    // Validate all colors and sizes if variants provided
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        await this.colorsService.findOne(variant.colorId);
        await this.sizesService.findOne(variant.sizeId);
      }
    }

    // Use transaction for atomic operation
    return await this.dataSource.transaction(async (manager) => {
      // Create product with price
      const product = manager.create(Product, {
        name: createProductDto.name,
        description: createProductDto.description,
        brandId,
        categoryId,
        price,
      });
      const savedProduct = await manager.save(product);

      // Create product images if provided
      if (productImages && productImages.length > 0) {
        const images = productImages.map((img) =>
          manager.create(ProductImage, {
            imageUrl: img.imageUrl,
            publicId: img.publicId,
            productId: savedProduct.id,
          }),
        );
        await manager.save(images);
        savedProduct.images = images;
      }

      // Create product variants if provided
      if (variants && variants.length > 0) {
        // Check for duplicate combinations within incoming variants
        const variantSignatures = new Set<string>();
        for (const variant of variants) {
          const signature = `${variant.colorId}-${variant.sizeId}`;
          if (variantSignatures.has(signature)) {
            throw new HttpException(
              `Duplicate variant with colorId ${variant.colorId} and sizeId ${variant.sizeId} in the same request`,
              HttpStatus.CONFLICT,
            );
          }
          variantSignatures.add(signature);
        }

        // Check for duplicate (productId, colorId, sizeId) combinations with existing variants in DB
        const existingVariants = await manager.find(ProductVariant, {
          where: {
            productId: savedProduct.id,
          },
        });

        for (const variant of variants) {
          const isDuplicate = existingVariants.some(
            (ev) => ev.colorId === variant.colorId && ev.sizeId === variant.sizeId,
          );
          if (isDuplicate) {
            throw new HttpException(
              `Variant with colorId ${variant.colorId} and sizeId ${variant.sizeId} already exists for this product`,
              HttpStatus.CONFLICT,
            );
          }
        }

        const productVariants = variants.map((variant, index) =>
          manager.create(ProductVariant, {
            sku: variant.sku,
            colorId: variant.colorId,
            sizeId: variant.sizeId,
            productId: savedProduct.id,
            ...(variantImagesMap?.[index] && {
              imageUrl: variantImagesMap[index].imageUrl,
              publicId: variantImagesMap[index].publicId,
            }),
          }),
        );
        await manager.save(productVariants);
        savedProduct.variants = productVariants;
      }

      return savedProduct;
    });
  }

  async updateFull(
    id: number,
    dto: UpdateProductFullDto,
    productImages: Array<{ imageUrl: string; publicId: string }> = [],
    variantImagesMap: Record<number, { imageUrl: string; publicId: string }> = {},
  ) {
    const keepImageIds = this.normalizeNumberArray(dto.keepImageIds);
    const removeVariantIds = this.normalizeNumberArray(dto.removeVariantIds);
    const variants = this.normalizeVariantArray(dto.variants);

    await this.ensureActiveProduct(id);

    if (dto.brandId !== undefined) {
      await this.brandsService.getById(Number(dto.brandId));
    }

    if (dto.categoryId !== undefined) {
      await this.categoriesService.getById(Number(dto.categoryId));
    }

    for (const variant of variants) {
      await this.colorsService.findOne(Number(variant.colorId));
      await this.sizesService.findOne(Number(variant.sizeId));
    }

    await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id, isActive: true },
        relations: ['images', 'variants'],
      });

      if (!product) {
        throw new HttpException(`Product with id ${id} not found`, HttpStatus.NOT_FOUND);
      }

      if (dto.name !== undefined) {
        const name = dto.name.trim();
        if (!name) {
          throw new HttpException('Product name can not be empty', HttpStatus.BAD_REQUEST);
        }
        product.name = name;
      }

      if (dto.description !== undefined) {
        product.description = dto.description;
      }

      if (dto.brandId !== undefined) {
        product.brandId = Number(dto.brandId);
      }

      if (dto.categoryId !== undefined) {
        product.categoryId = Number(dto.categoryId);
      }

      if (dto.price !== undefined) {
        const price = Number(dto.price);
        if (!Number.isFinite(price) || price < 0) {
          throw new HttpException('Product price must be a valid positive number', HttpStatus.BAD_REQUEST);
        }
        product.price = price;
      }

      if (dto.isActive !== undefined) {
        product.isActive = this.normalizeBoolean(dto.isActive);
      }

      await manager.save(product);

      if (dto.keepImageIds !== undefined) {
        const activeImages = product.images?.filter((image) => image.isActive) ?? [];
        const invalidKeepImageIds = keepImageIds.filter((imageId) => !activeImages.some((image) => image.id === imageId));
        if (invalidKeepImageIds.length > 0) {
          throw new HttpException(
            `Image ids do not belong to product ${id}: ${invalidKeepImageIds.join(', ')}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const removeImageIds = activeImages
          .filter((image) => !keepImageIds.includes(image.id))
          .map((image) => image.id);

        if (removeImageIds.length > 0) {
          await manager.update(ProductImage, { id: In(removeImageIds), productId: id }, { isActive: false });
        }
      }

      if (productImages.length > 0) {
        const newImages = productImages.map((image) =>
          manager.create(ProductImage, {
            productId: id,
            imageUrl: image.imageUrl,
            publicId: image.publicId,
          }),
        );
        await manager.save(newImages);
      }

      if (removeVariantIds.length > 0) {
        const existingRemoveVariants = await manager.find(ProductVariant, {
          where: { id: In(removeVariantIds), productId: id },
        });
        if (existingRemoveVariants.length !== removeVariantIds.length) {
          throw new HttpException('One or more variants do not belong to this product', HttpStatus.BAD_REQUEST);
        }
        await manager.update(ProductVariant, { id: In(removeVariantIds), productId: id }, { isActive: false });
      }

      if (variants.length > 0) {
        const activeVariants = await manager.find(ProductVariant, {
          where: { productId: id, isActive: true },
        });
        const variantsById = new Map(activeVariants.map((variant) => [variant.id, variant]));
        const nextSignatures = new Map<string, number | 'new'>();
        const incomingSignatures = new Set<string>();

        for (const activeVariant of activeVariants) {
          if (!removeVariantIds.includes(activeVariant.id)) {
            nextSignatures.set(`${activeVariant.colorId}-${activeVariant.sizeId}`, activeVariant.id);
          }
        }

        for (const variant of variants) {
          const colorId = Number(variant.colorId);
          const sizeId = Number(variant.sizeId);
          const signature = `${colorId}-${sizeId}`;
          if (incomingSignatures.has(signature)) {
            throw new HttpException(
              `Duplicate variant with colorId ${colorId} and sizeId ${sizeId}`,
              HttpStatus.CONFLICT,
            );
          }
          incomingSignatures.add(signature);

          const existingSignatureOwner = nextSignatures.get(signature);

          if (existingSignatureOwner !== undefined && existingSignatureOwner !== (variant.id ?? 'new')) {
            throw new HttpException(
              `Duplicate variant with colorId ${colorId} and sizeId ${sizeId}`,
              HttpStatus.CONFLICT,
            );
          }

          let entity: ProductVariant;
          if (variant.id) {
            const existingVariant = variantsById.get(Number(variant.id));
            if (!existingVariant) {
              throw new HttpException(
                `Variant with id ${variant.id} does not belong to active product ${id}`,
                HttpStatus.BAD_REQUEST,
              );
            }
            entity = existingVariant;
            nextSignatures.delete(`${entity.colorId}-${entity.sizeId}`);
          } else {
            entity = manager.create(ProductVariant, { productId: id });
          }

          const duplicateVariant = await manager.findOne(ProductVariant, {
            where: { productId: id, colorId, sizeId },
          });
          if (duplicateVariant && duplicateVariant.id !== entity.id) {
            throw new HttpException(
              `Variant with colorId ${colorId} and sizeId ${sizeId} already exists for this product`,
              HttpStatus.CONFLICT,
            );
          }

          entity.colorId = colorId;
          entity.sizeId = sizeId;
          entity.sku = variant.sku?.trim() || undefined;
          entity.isActive = true;

          if (variant.removeImage) {
            entity.imageUrl = undefined;
            entity.publicId = undefined;
          }

          if (variant.imageFileIndex !== undefined && variant.imageFileIndex !== null) {
            const uploadedImage = variantImagesMap[Number(variant.imageFileIndex)];
            if (!uploadedImage) {
              throw new HttpException(
                `Variant image at index ${variant.imageFileIndex} was not uploaded`,
                HttpStatus.BAD_REQUEST,
              );
            }
            entity.imageUrl = uploadedImage.imageUrl;
            entity.publicId = uploadedImage.publicId;
          }

          nextSignatures.set(signature, variant.id ?? 'new');
          await manager.save(entity);
        }
      }
    });

    return this.findOne(id);
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC', department } = query;
    const where: FindOptionsWhere<Product> = {
      isActive: true,
      ...(search ? { name: ILike(`%${search}%`) } : {}),
      ...(department ? { category: { department } } : {}),
    };

    const [data, total] = await this.productsRepository.findAndCount({
      where,
      relations: ['brand', 'category', 'images', 'variants'],
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
    });

    const publicCoupons = await this.couponsService.getPublicActiveCoupons();

    // Get product IDs for querying sold quantities
    const productIds = data.map((p) => p.id);

    // Query sold quantities for all products' variants
    const soldQuantitiesByProduct: Record<number, number> = {};
    if (productIds.length > 0) {
      const variants = data.flatMap((p) =>
        p.variants
          ?.filter((v) => v.isActive)
          .map((v) => ({ id: v.id, productId: p.id })) ?? [],
      );

      if (variants.length > 0) {
        const variantIds = variants.map((v) => v.id);

        // Query all EXPORT transactions for these variants
        const soldData: Array<{ product_id: number; sold_quantity: string }> = await this.inventoryTransactionRepository.query(
          `SELECT pv.product_id, COALESCE(SUM(it.quantity), 0) as sold_quantity
           FROM inventory_transactions it
           JOIN product_variants pv ON it.variant_id = pv.id
           WHERE it.type = $1 AND pv.id = ANY($2)
           GROUP BY pv.product_id`,
          [InventoryType.EXPORT, variantIds],
        );

        // Map sold quantities by product ID
        soldData.forEach((row) => {
          soldQuantitiesByProduct[row.product_id] = Number(row.sold_quantity) || 0;
        });
      }
    }

    // Filter images and variants by isActive and add stats
    const processedData = data.map((product) => ({
      ...getBestCouponForProduct(product, publicCoupons),
      ...product,
      images: product.images?.filter((img) => img.isActive) ?? [],
      variants: product.variants?.filter((v) => v.isActive) ?? [],
      averageRating: product.averageRating || 0,
      soldQuantity: soldQuantitiesByProduct[product.id] || 0,
    }));

    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data: processedData,
    };
    return response;
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id, isActive: true },
      relations: ['brand', 'category', 'images', 'variants'],
    });

    if (!product)
      throw new HttpException(`Product with id ${id} not found`, HttpStatus.NOT_FOUND);

    // Get active variants
    const activeVariants = product.variants?.filter((v) => v.isActive) ?? [];

    // Get stock quantities for all variants
    const inventories = activeVariants.length > 0
      ? await this.inventoryRepository.find({
        where: { variantId: In(activeVariants.map((v) => v.id)) },
      })
      : [];

    const stockByVariant = Object.fromEntries(
      inventories.map((inv) => [inv.variantId, inv.quantity]),
    );

    // Get sold quantities for all variants
    const soldByVariant: Record<number, number> = {};
    if (activeVariants.length > 0) {
      const variantIds = activeVariants.map((v) => v.id);
      const soldData = await this.inventoryTransactionRepository.query(
        `SELECT variant_id, COALESCE(SUM(quantity), 0) AS sold_quantity
         FROM inventory_transactions
         WHERE type = $1 AND variant_id = ANY($2)
         GROUP BY variant_id`,
        [InventoryType.EXPORT, variantIds],
      );

      soldData.forEach((row: any) => {
        soldByVariant[row.variant_id] = parseInt(row.sold_quantity, 10);
      });
    }

    const processedVariants = activeVariants.map((v) => ({
      ...v,
      stockQuantity: stockByVariant[v.id] ?? 0,
      soldQuantity: soldByVariant[v.id] ?? 0,
    }));

    const totalSoldQuantity = processedVariants.reduce(
      (sum, variant) => sum + (variant.soldQuantity ?? 0),
      0,
    );

    // Filter images and variants by isActive, add stock/sold quantity
    return {
      ...product,
      images: product.images?.filter((img) => img.isActive) ?? [],
      soldQuantity: totalSoldQuantity,
      variants: processedVariants,
    };
  }

  async remove(id: number) {
    // Check if product exists and is active
    const product = await this.productsRepository.findOne({
      where: { id, isActive: true },
      relations: ['images', 'variants'],
    });

    if (!product) {
      throw new HttpException(
        `Product with id ${id} not found or already deleted`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Use transaction for atomic soft delete operation
    return await this.dataSource.transaction(async (manager) => {
      // Soft delete all product images
      if (product.images && product.images.length > 0) {
        await manager.update(
          ProductImage,
          { productId: id },
          { isActive: false },
        );
      }

      // Soft delete all product variants
      if (product.variants && product.variants.length > 0) {
        await manager.update(
          ProductVariant,
          { productId: id },
          { isActive: false },
        );
      }

      // Soft delete product itself
      product.isActive = false;
      return await manager.save(product);
    });
  }

  async findTryonAssets(productId: number, activeOnly = true) {
    await this.ensureActiveProduct(productId);

    return this.productTryonAssetsRepository.find({
      where: {
        productId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      relations: ['variant'],
      order: {
        id: 'ASC',
      },
    });
  }

  async createTryonAsset(productId: number, dto: CreateProductTryonAssetDto) {
    await this.ensureActiveProduct(productId);
    await this.ensureVariantBelongsToProduct(productId, dto.variantId);

    const deeparEffectUrl = dto.deeparEffectUrl?.trim();
    if (!deeparEffectUrl) {
      throw new HttpException('DeepAR effect file is required', HttpStatus.BAD_REQUEST);
    }

    const asset = this.productTryonAssetsRepository.create({
      productId,
      variantId: dto.variantId ?? null,
      assetType: dto.assetType,
      displayName: dto.displayName.trim(),
      deeparEffectUrl,
      thumbnailUrl: dto.thumbnailUrl?.trim() || null,
      isActive: dto.isActive ?? true,
    });

    return this.productTryonAssetsRepository.save(asset);
  }

  async updateTryonAsset(
    productId: number,
    assetId: number,
    dto: UpdateProductTryonAssetDto,
  ) {
    await this.ensureActiveProduct(productId);

    const asset = await this.productTryonAssetsRepository.findOne({
      where: { id: assetId, productId },
    });

    if (!asset) {
      throw new HttpException(
        `Try-on asset with id ${assetId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.variantId !== undefined) {
      await this.ensureVariantBelongsToProduct(productId, dto.variantId);
      asset.variantId = dto.variantId ?? null;
    }

    if (dto.assetType !== undefined) {
      asset.assetType = dto.assetType;
    }

    if (dto.displayName !== undefined) {
      const displayName = dto.displayName.trim();
      if (!displayName) {
        throw new HttpException('Display name can not be empty', HttpStatus.BAD_REQUEST);
      }
      asset.displayName = displayName;
    }

    if (dto.deeparEffectUrl !== undefined) {
      const deeparEffectUrl = dto.deeparEffectUrl.trim();
      if (!deeparEffectUrl) {
        throw new HttpException('DeepAR effect URL can not be empty', HttpStatus.BAD_REQUEST);
      }
      asset.deeparEffectUrl = deeparEffectUrl;
    }

    if (dto.thumbnailUrl !== undefined) {
      asset.thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    }

    if (dto.isActive !== undefined) {
      asset.isActive = dto.isActive;
    }

    return this.productTryonAssetsRepository.save(asset);
  }

  async removeTryonAsset(productId: number, assetId: number) {
    await this.ensureActiveProduct(productId);

    const asset = await this.productTryonAssetsRepository.findOne({
      where: { id: assetId, productId },
    });

    if (!asset) {
      throw new HttpException(
        `Try-on asset with id ${assetId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    asset.isActive = false;
    return this.productTryonAssetsRepository.save(asset);
  }

  async searchByImage(
    fileBuffer: Buffer,
    fileName: string,
    topK: number = 12,
  ): Promise<ImageSearchResultDto[]> {
    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new HttpException(
        'File size exceeds maximum limit of 5MB',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    // Forward request to AI service
    return await this.aiService.searchByImage(fileBuffer, fileName, topK);
  }

  private normalizeNumberArray(value?: unknown): number[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value;
    } catch {
      throw new HttpException('Expected a valid JSON array of numbers', HttpStatus.BAD_REQUEST);
    }

    if (!Array.isArray(parsed)) {
      throw new HttpException('Expected an array of numbers', HttpStatus.BAD_REQUEST);
    }

    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }

  private normalizeVariantArray(value?: unknown): UpdateProductFullVariantDto[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value;
    } catch {
      throw new HttpException('Expected variants to be a valid JSON array', HttpStatus.BAD_REQUEST);
    }

    if (!Array.isArray(parsed)) {
      throw new HttpException('Expected variants to be an array', HttpStatus.BAD_REQUEST);
    }

    return parsed.map((item) => {
      const variant = item as Record<string, unknown>;
      const colorId = Number(variant.colorId);
      const sizeId = Number(variant.sizeId);
      if (!Number.isFinite(colorId) || !Number.isFinite(sizeId)) {
        throw new HttpException('Variant colorId and sizeId are required', HttpStatus.BAD_REQUEST);
      }

      return {
        id: variant.id !== undefined && variant.id !== null ? Number(variant.id) : undefined,
        sku: typeof variant.sku === 'string' ? variant.sku : undefined,
        colorId,
        sizeId,
        imageFileIndex: variant.imageFileIndex !== undefined && variant.imageFileIndex !== null
          ? Number(variant.imageFileIndex)
          : undefined,
        removeImage: this.normalizeBoolean(variant.removeImage),
      };
    });
  }

  private normalizeBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === '1' || value === 1;
  }

  private async ensureActiveProduct(productId: number) {
    const product = await this.productsRepository.findOne({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new HttpException(`Product with id ${productId} not found`, HttpStatus.NOT_FOUND);
    }

    return product;
  }

  private async ensureVariantBelongsToProduct(productId: number, variantId?: number | null) {
    if (!variantId) {
      return;
    }

    const variant = await this.productVariantsRepository.findOne({
      where: { id: variantId, productId, isActive: true },
    });

    if (!variant) {
      throw new HttpException(
        `Variant with id ${variantId} does not belong to product ${productId}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async searchByVoice(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<VoiceSearchResponseDto> {
    const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
    if (fileBuffer.length > MAX_AUDIO_SIZE) {
      throw new HttpException(
        'Audio size exceeds maximum limit of 10MB',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    return await this.aiService.searchByVoice(fileBuffer, fileName);
  }

  async transcribeVoice(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<VoiceTranscriptionResponseDto> {
    const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
    if (fileBuffer.length > MAX_AUDIO_SIZE) {
      throw new HttpException(
        'Audio size exceeds maximum limit of 10MB',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    return await this.aiService.transcribeVoice(fileBuffer, fileName);
  }

  async virtualTryon2D(
    productId: number,
    personFile: Express.Multer.File,
    garmentDesc?: string,
  ): Promise<{ resultImageUrl: string }> {
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    if (personFile.size > MAX_IMAGE_SIZE) {
      throw new HttpException('Person image exceeds 10MB limit', HttpStatus.PAYLOAD_TOO_LARGE);
    }

    const product = await this.productsRepository.findOne({
      where: { id: productId, isActive: true },
      relations: ['images', 'variants'],
    });
    if (!product) {
      throw new HttpException(`Product with id ${productId} not found`, HttpStatus.NOT_FOUND);
    }

    const garmentImageUrl =
      product.images?.[0]?.imageUrl ?? product.variants?.[0]?.imageUrl;
    if (!garmentImageUrl) {
      throw new HttpException('Product has no images to use as garment', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // Download garment image
    const garmentResponse = await fetch(garmentImageUrl, { signal: AbortSignal.timeout(15000) });
    if (!garmentResponse.ok) {
      throw new HttpException('Failed to fetch garment image', HttpStatus.BAD_GATEWAY);
    }
    const garmentBuffer = Buffer.from(await garmentResponse.arrayBuffer());

    const resultBuffer = await this.aiService.virtualTryon(
      personFile.buffer,
      garmentBuffer,
      garmentDesc ?? product.name,
    );

    const uploaded = await this.cloudinaryService.uploadBufferToFolder(resultBuffer, 'virtual-tryon');
    return { resultImageUrl: uploaded.secure_url };
  }
}
