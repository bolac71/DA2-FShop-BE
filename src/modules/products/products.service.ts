/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductTryonAsset } from './entities/product-tryon-asset.entity';
import { CreateProductDto, CreateProductTryonAssetDto, ImageSearchResultDto, ProductQueryDto, UpdateProductTryonAssetDto, VoiceSearchResponseDto, VoiceTranscriptionResponseDto } from './dtos';
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
import sharp from 'sharp';

import { getBestCouponForProduct } from 'src/utils/product.util';

type OutfitTryonProduct = Product & {
  images?: ProductImage[];
  variants?: ProductVariant[];
};

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

  async virtualTryonOutfit(
    personFile: Express.Multer.File,
    productIds: number[],
    stylePrompt?: string,
  ): Promise<{ resultImageUrl: string; provider: 'gemini'; productIds: number[] }> {
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_PRODUCTS = 3;

    if (personFile.size > MAX_IMAGE_SIZE) {
      throw new HttpException('Person image exceeds 10MB limit', HttpStatus.PAYLOAD_TOO_LARGE);
    }

    const uniqueIds = Array.from(new Set(productIds.filter((id) => Number.isInteger(id) && id > 0)));
    if (uniqueIds.length === 0) {
      throw new HttpException('At least one product is required', HttpStatus.BAD_REQUEST);
    }
    if (uniqueIds.length > MAX_PRODUCTS) {
      throw new HttpException(`Gemini outfit preview supports up to ${MAX_PRODUCTS} products`, HttpStatus.BAD_REQUEST);
    }

    const products = await this.productsRepository.find({
      where: { id: In(uniqueIds), isActive: true },
      relations: ['images', 'variants', 'brand', 'category'],
    }) as OutfitTryonProduct[];

    const productMap = new Map(products.map((product) => [product.id, product]));
    const orderedProducts = uniqueIds.map((id) => productMap.get(id)).filter(Boolean) as OutfitTryonProduct[];
    if (orderedProducts.length !== uniqueIds.length) {
      throw new HttpException('One or more products were not found or are inactive', HttpStatus.NOT_FOUND);
    }

    const productsWithImages = orderedProducts.map((product) => ({
      product,
      imageUrl: this.resolveTryonProductImageUrl(product),
    }));
    const missingImageProduct = productsWithImages.find((item) => !item.imageUrl);
    if (missingImageProduct) {
      throw new HttpException(
        `Product "${missingImageProduct.product.name}" has no image to use for outfit preview`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const imageBuffers = await Promise.all(
      productsWithImages.map(async ({ imageUrl }) => this.downloadRemoteImage(imageUrl as string)),
    );
    const garmentSheet = await this.buildOutfitContactSheet(productsWithImages.map((item, index) => ({
      index: index + 1,
      name: item.product.name,
      brand: item.product.brand?.name,
      category: item.product.category?.name,
      imageBuffer: imageBuffers[index],
    })));
    const prompt = this.buildGeminiOutfitPrompt(orderedProducts, stylePrompt);
    const resultBuffer = await this.aiService.virtualTryonOutfit(personFile.buffer, garmentSheet, prompt);
    const uploaded = await this.cloudinaryService.uploadBufferToFolder(resultBuffer, 'virtual-tryon/gemini');

    return { resultImageUrl: uploaded.secure_url, provider: 'gemini', productIds: uniqueIds };
  }

  private resolveTryonProductImageUrl(product: OutfitTryonProduct): string | null {
    return product.images?.find((image) => image.isActive)?.imageUrl
      ?? product.images?.[0]?.imageUrl
      ?? product.variants?.find((variant) => variant.isActive && variant.imageUrl)?.imageUrl
      ?? product.variants?.find((variant) => variant.imageUrl)?.imageUrl
      ?? null;
  }

  private async downloadRemoteImage(url: string): Promise<Buffer> {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      throw new HttpException('Failed to fetch product image for outfit preview', HttpStatus.BAD_GATEWAY);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private truncateLabel(value: string, maxLength = 34): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }

  private async buildOutfitContactSheet(items: Array<{
    index: number;
    name: string;
    brand?: string;
    category?: string;
    imageBuffer: Buffer;
  }>): Promise<Buffer> {
    const cardWidth = 280;
    const cardHeight = 330;
    const padding = 18;
    const width = (cardWidth * items.length) + (padding * (items.length + 1));
    const height = cardHeight + (padding * 2);
    const composites: sharp.OverlayOptions[] = [];

    for (const [idx, item] of items.entries()) {
      const left = padding + (idx * (cardWidth + padding));
      const top = padding;
      const image = await sharp(item.imageBuffer)
        .rotate()
        .resize(230, 220, { fit: 'contain', background: '#ffffff' })
        .png()
        .toBuffer();
      const label = this.escapeXml(`Item ${item.index}: ${this.truncateLabel(item.name)}`);
      const meta = this.escapeXml(this.truncateLabel([item.brand, item.category].filter(Boolean).join(' · '), 38));
      const cardSvg = Buffer.from(`
        <svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${cardWidth}" height="${cardHeight}" rx="18" fill="#ffffff" stroke="#dbe3ef" stroke-width="2"/>
          <text x="18" y="270" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#102033">${label}</text>
          <text x="18" y="299" font-family="Arial, sans-serif" font-size="15" fill="#607089">${meta}</text>
        </svg>
      `);

      composites.push({ input: cardSvg, left, top });
      composites.push({ input: image, left: left + 25, top: top + 22 });
    }

    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: '#f8fafc',
      },
    })
      .composite(composites)
      .jpeg({ quality: 92 })
      .toBuffer();
  }

  private buildGeminiOutfitPrompt(products: OutfitTryonProduct[], stylePrompt?: string): string {
    const itemLines = products.map((product, index) => {
      const descriptors = [
        product.brand?.name,
        product.category?.name,
        product.name,
      ].filter(Boolean).join(' - ');
      return `Item ${index + 1}: ${descriptors}`;
    });

    return [
      'Apply these exact catalog products to the person in the uploaded photo:',
      ...itemLines,
      'Keep the result realistic and suitable for an ecommerce fashion preview.',
      'Preserve the original person identity, body proportions, face, pose, lighting, and camera angle.',
      'Do not add products that are not listed.',
      stylePrompt?.trim() ? `User styling request: ${stylePrompt.trim()}` : '',
    ].filter(Boolean).join('\n');
  }
}
