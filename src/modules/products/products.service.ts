/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { ColorsService } from '../colors/colors.service';
import { SizesService } from '../sizes/sizes.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
    @InjectRepository(ProductVariant)
    private productVariantsRepository: Repository<ProductVariant>,
    private dataSource: DataSource,
    private brandsService: BrandsService,
    private categoriesService: CategoriesService,
    private colorsService: ColorsService,
    private sizesService: SizesService,
  ) {}

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

    // Filter images and variants by isActive
    const processedData = data.map((product) => ({
      ...product,
      images: product.images?.filter((img) => img.isActive) ?? [],
      variants: product.variants?.filter((v) => v.isActive) ?? [],
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
    

    // Filter images and variants by isActive
    return {
      ...product,
      images: product.images?.filter((img) => img.isActive) ?? [],
      variants: product.variants?.filter((v) => v.isActive) ?? [],
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
}
