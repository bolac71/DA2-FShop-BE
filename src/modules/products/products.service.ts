/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto, ImageSearchResultDto, UpdateProductDto, UpdateProductFullDto, VoiceSearchResponseDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';
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

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
    @InjectRepository(ProductVariant)
    private productVariantsRepository: Repository<ProductVariant>,
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

  private ensureUniqueVariantCombination(
    variants: Array<{ id?: number; colorId: number; sizeId: number }>,
  ) {
    const signatures = new Set<string>();
    for (const variant of variants) {
      const signature = `${variant.colorId}-${variant.sizeId}`;
      if (signatures.has(signature)) {
        throw new HttpException(
          `Duplicate variant combination colorId ${variant.colorId}, sizeId ${variant.sizeId}`,
          HttpStatus.CONFLICT,
        );
      }
      signatures.add(signature);
    }
  }

  private getCouponDiscountAmount(coupon: Coupon, productPrice: number) {
    const couponValue = Number(coupon.value) || 0;
    const maxDiscountAmount = Number(coupon.maxDiscountAmount) || 0;

    if (coupon.type === CouponType.FIXED) {
      return Math.min(couponValue, productPrice);
    }

    if (coupon.type === CouponType.PERCENT) {
      const rawDiscount = (productPrice * couponValue) / 100;
      const cappedDiscount =
        maxDiscountAmount > 0 ? Math.min(rawDiscount, maxDiscountAmount) : rawDiscount;
      return Math.min(cappedDiscount, productPrice);
    }

    return 0;
  }

  private getBestCouponForProduct(product: Product, coupons: Coupon[]) {
    const now = new Date();
    const productPrice = Number(product.price) || 0;

    let bestCoupon: Coupon | null = null;
    let maxDiscount = 0;

    for (const coupon of coupons) {
      if (!coupon.isPublic || !coupon.isActive || coupon.status !== CouponStatus.ACTIVE) {
        continue;
      }

      if (coupon.startDate > now || coupon.endDate < now) {
        continue;
      }

      if (coupon.applicableProduct && coupon.applicableProduct !== product.id) {
        continue;
      }

      if ((Number(coupon.minOrderAmount) || 0) > productPrice) {
        continue;
      }

      if ((coupon.maxUses || 0) > 0 && (coupon.usedCount || 0) >= (coupon.maxUses || 0)) {
        continue;
      }

      const discount = this.getCouponDiscountAmount(coupon, productPrice);

      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestCoupon = coupon;
      }
    }

    return {
      maxCouponDiscount: Number(maxDiscount.toFixed(2)),
      bestCouponCode: bestCoupon?.code ?? null,
    };
  }

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

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.productsRepository.findAndCount({
      where: search
        ? [{ isActive: true, name: ILike(`%${search}%`) }]
        : { isActive: true },
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
      ...this.getBestCouponForProduct(product, publicCoupons),
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
      relations: ['brand', 'category', 'images', 'variants', 'variants.color', 'variants.size'],
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

  async update(id: number, updateProductDto: UpdateProductDto) {
    if (Object.keys(updateProductDto).length === 0) {
      throw new HttpException('No fields provided for update', HttpStatus.BAD_REQUEST);
    }

    const product = await this.productsRepository.findOne({
      where: { id, isActive: true },
    });

    if (!product) {
      throw new HttpException(`Product with id ${id} not found`, HttpStatus.NOT_FOUND);
    }

    if (updateProductDto.brandId !== undefined) {
      await this.brandsService.getById(updateProductDto.brandId);
    }

    if (updateProductDto.categoryId !== undefined) {
      await this.categoriesService.getById(updateProductDto.categoryId);
    }

    Object.assign(product, {
      ...(updateProductDto.name !== undefined && { name: updateProductDto.name }),
      ...(updateProductDto.description !== undefined && { description: updateProductDto.description }),
      ...(updateProductDto.brandId !== undefined && { brandId: updateProductDto.brandId }),
      ...(updateProductDto.categoryId !== undefined && { categoryId: updateProductDto.categoryId }),
      ...(updateProductDto.price !== undefined && { price: updateProductDto.price }),
      ...(updateProductDto.isActive !== undefined && { isActive: updateProductDto.isActive }),
    });

    const updatedProduct = await this.productsRepository.save(product);
    return this.findOne(updatedProduct.id);
  }

  async updateFull(
    id: number,
    updateDto: UpdateProductFullDto,
    productImages: Express.Multer.File[] = [],
    variantImages: Express.Multer.File[] = [],
  ) {
    const product = await this.productsRepository.findOne({
      where: { id, isActive: true },
      relations: ['images', 'variants'],
    });

    if (!product) {
      throw new HttpException(`Product with id ${id} not found`, HttpStatus.NOT_FOUND);
    }

    const currentImages = product.images ?? [];
    const currentVariants = product.variants ?? [];

    if (updateDto.brandId !== undefined) {
      await this.brandsService.getById(updateDto.brandId);
    }

    if (updateDto.categoryId !== undefined) {
      await this.categoriesService.getById(updateDto.categoryId);
    }

    const upsertVariants = updateDto.variants ?? [];
    const removeVariantIds = new Set(updateDto.removeVariantIds ?? []);
    const keepImageIds = new Set(
      updateDto.keepImageIds ?? currentImages.filter((img) => img.isActive).map((img) => img.id),
    );

    const hasAnyChange =
      Object.keys(updateDto).length > 0 ||
      productImages.length > 0 ||
      variantImages.length > 0;

    if (!hasAnyChange) {
      throw new HttpException('No fields provided for update', HttpStatus.BAD_REQUEST);
    }

    const uploadedGallery =
      productImages.length > 0
        ? await Promise.all(productImages.map((file) => this.cloudinaryService.uploadFile(file)))
        : [];

    const uploadedVariantImages =
      variantImages.length > 0
        ? await Promise.all(variantImages.map((file) => this.cloudinaryService.uploadFile(file)))
        : [];

    const uploadedPublicIds: string[] = [];
    for (const upload of [...uploadedGallery, ...uploadedVariantImages]) {
      const publicId = (upload as { public_id?: string }).public_id;
      if (typeof publicId === 'string' && publicId.length > 0) {
        uploadedPublicIds.push(publicId);
      }
    }

    const oldPublicIdsToDelete = new Set<string>();

    try {
      await this.dataSource.transaction(async (manager) => {
        Object.assign(product, {
          ...(updateDto.name !== undefined && { name: updateDto.name }),
          ...(updateDto.description !== undefined && { description: updateDto.description }),
          ...(updateDto.brandId !== undefined && { brandId: updateDto.brandId }),
          ...(updateDto.categoryId !== undefined && { categoryId: updateDto.categoryId }),
          ...(updateDto.price !== undefined && { price: updateDto.price }),
          ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
        });

        await manager.save(product);

        for (const image of currentImages) {
          if (!image.isActive) {
            continue;
          }

          if (!keepImageIds.has(image.id)) {
            image.isActive = false;
            await manager.save(image);
            if (image.publicId) {
              oldPublicIdsToDelete.add(image.publicId);
            }
          }
        }

        if (uploadedGallery.length > 0) {
          const normalizedGalleryUploads = uploadedGallery.filter(
            (upload): upload is NonNullable<typeof upload> => Boolean(upload),
          );

          const newGalleryEntities = normalizedGalleryUploads.map((upload) =>
            manager.create(ProductImage, {
              productId: product.id,
              imageUrl: upload.secure_url,
              publicId: upload.public_id,
              isActive: true,
            }),
          );
          await manager.save(newGalleryEntities);
        }

        const activeVariants = currentVariants.filter((variant) => variant.isActive);
        const variantById = new Map(currentVariants.map((variant) => [variant.id, variant]));

        for (const variantId of removeVariantIds) {
          const variant = variantById.get(variantId);
          if (!variant || variant.productId !== product.id || !variant.isActive) {
            continue;
          }

          variant.isActive = false;
          await manager.save(variant);
          if (variant.publicId) {
            oldPublicIdsToDelete.add(variant.publicId);
          }
        }

        const finalVariantsForUniqueCheck: Array<{ id?: number; colorId: number; sizeId: number }> =
          activeVariants
            .filter((variant) => !removeVariantIds.has(variant.id))
            .map((variant) => ({ id: variant.id, colorId: variant.colorId, sizeId: variant.sizeId }));

        const existingVariantPayloadIds = new Set<number>();

        for (const variantInput of upsertVariants) {
          await this.colorsService.findOne(variantInput.colorId);
          await this.sizesService.findOne(variantInput.sizeId);

          if (variantInput.id) {
            existingVariantPayloadIds.add(variantInput.id);
            const existing = variantById.get(variantInput.id);
            if (!existing || existing.productId !== product.id) {
              throw new HttpException(
                `Variant with id ${variantInput.id} not found for this product`,
                HttpStatus.NOT_FOUND,
              );
            }

            const currentIndex = finalVariantsForUniqueCheck.findIndex((item) => item.id === existing.id);
            if (currentIndex >= 0) {
              finalVariantsForUniqueCheck[currentIndex] = {
                id: existing.id,
                colorId: variantInput.colorId,
                sizeId: variantInput.sizeId,
              };
            }
          } else {
            finalVariantsForUniqueCheck.push({
              colorId: variantInput.colorId,
              sizeId: variantInput.sizeId,
            });
          }
        }

        this.ensureUniqueVariantCombination(finalVariantsForUniqueCheck);

        for (const variantInput of upsertVariants) {
          const nextVariantImage =
            variantInput.imageFileIndex !== undefined
              ? uploadedVariantImages[variantInput.imageFileIndex]
              : undefined;

          if (variantInput.id) {
            const existing = variantById.get(variantInput.id) as ProductVariant;
            if (removeVariantIds.has(existing.id)) {
              throw new HttpException(
                `Variant with id ${existing.id} cannot be updated and removed in same request`,
                HttpStatus.BAD_REQUEST,
              );
            }

            const conflict = await manager.findOne(ProductVariant, {
              where: {
                productId: product.id,
                colorId: variantInput.colorId,
                sizeId: variantInput.sizeId,
              },
            });

            if (conflict && conflict.id !== existing.id) {
              throw new HttpException(
                `Variant with colorId ${variantInput.colorId} and sizeId ${variantInput.sizeId} already exists`,
                HttpStatus.CONFLICT,
              );
            }

            existing.sku = variantInput.sku;
            existing.colorId = variantInput.colorId;
            existing.sizeId = variantInput.sizeId;
            existing.isActive = true;

            if (nextVariantImage) {
              if (existing.publicId) {
                oldPublicIdsToDelete.add(existing.publicId);
              }
              existing.imageUrl = nextVariantImage.secure_url;
              existing.publicId = nextVariantImage.public_id;
            } else if (variantInput.removeImage) {
              if (existing.publicId) {
                oldPublicIdsToDelete.add(existing.publicId);
              }
              existing.imageUrl = undefined;
              existing.publicId = undefined;
            }

            await manager.save(existing);
          } else {
            const conflict = await manager.findOne(ProductVariant, {
              where: {
                productId: product.id,
                colorId: variantInput.colorId,
                sizeId: variantInput.sizeId,
              },
            });

            if (conflict) {
              throw new HttpException(
                `Variant with colorId ${variantInput.colorId} and sizeId ${variantInput.sizeId} already exists`,
                HttpStatus.CONFLICT,
              );
            }

            const created = manager.create(ProductVariant, {
              productId: product.id,
              sku: variantInput.sku,
              colorId: variantInput.colorId,
              sizeId: variantInput.sizeId,
              isActive: true,
              ...(nextVariantImage && {
                imageUrl: nextVariantImage.secure_url,
                publicId: nextVariantImage.public_id,
              }),
            });
            await manager.save(created);
          }
        }

        if (upsertVariants.length === 0 && existingVariantPayloadIds.size === 0) {
          return;
        }
      });
    } catch (error) {
      if (uploadedPublicIds.length > 0) {
        await Promise.allSettled(
          uploadedPublicIds.map((publicId) => this.cloudinaryService.deleteFile(publicId)),
        );
      }
      throw error;
    }

    if (oldPublicIdsToDelete.size > 0) {
      setImmediate(() => {
        Promise.allSettled(
          [...oldPublicIdsToDelete].map((publicId) => this.cloudinaryService.deleteFile(publicId)),
        ).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Failed to cleanup old product images:', error);
        });
      });
    }

    return this.findOne(id);
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
}
