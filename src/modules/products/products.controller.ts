import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  ParseIntPipe, 
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  HttpException,
  HttpStatus,
  Res,

  NotFoundException,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from 'src/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiOperation, ApiTags, ApiConsumes, ApiNotFoundResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  CreateProductTryonAssetDto,
  ImageSearchDto,
  ImageSearchResultDto,
  ProductQueryDto,
  UpdateProductFullDto,
  UpdateProductTryonAssetDto,
  VoiceSearchResponseDto,
  VoiceTranscriptionResponseDto,
} from './dtos';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MinioService } from '../minio/minio.service';
import { SkipTransform } from 'src/decorators/skip-transform.decorator';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

import { InteractionInterceptor } from '../user-interactions/interaction.interceptor';

@ApiTags('Products')
@Controller('products')
export class ProductsController {

  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly minioService: MinioService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'productImages', maxCount: 10 },
      { name: 'variantImages', maxCount: 100 },
    ]),
  )
  @ApiOperation({ summary: 'Create product with images and variants' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() 
    files?: {
      productImages?: Express.Multer.File[];
      variantImages?: Express.Multer.File[];
    },
  ) {
    // Process product gallery images
    const productImages: any[] = [];
    if (files?.productImages && files.productImages.length > 0) {
      for (const file of files.productImages) {
        const uploaded = await this.cloudinaryService.uploadFile(file);
        productImages.push({
          imageUrl: uploaded?.secure_url,
          publicId: uploaded?.public_id,
        });
      }
    }

    // Process variant images and map to variants by index
    const variantImagesMap: Record<number, { imageUrl: string; publicId: string }> = {};
    if (files?.variantImages && files.variantImages.length > 0) {
      for (let i = 0; i < files.variantImages.length; i++) {
        const file = files.variantImages[i];
        const uploaded = await this.cloudinaryService.uploadFile(file);
        variantImagesMap[i] = {
          imageUrl: uploaded?.secure_url || '',
          publicId: uploaded?.public_id || '',
        };
      }
    }

    // Pass variants and images separately to service
    return this.productsService.create(createProductDto, productImages, variantImagesMap);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active products with pagination and search' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Post('search/image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Search products by image similarity' })
  async searchByImage(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ImageSearchDto,
  ): Promise<ImageSearchResultDto[]> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const topK = Math.min(query.topK || 12, 30); // Limit to max 30 results
    return this.productsService.searchByImage(file.buffer, file.originalname, topK);
  }

  @Post('search/voice')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Search products by voice query' })
  async searchByVoice(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<VoiceSearchResponseDto> {
    if (!file) {
      throw new HttpException('Audio file is required', HttpStatus.BAD_REQUEST);
    }

    return this.productsService.searchByVoice(file.buffer, file.originalname);
  }

  @Post('transcribe/voice')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Transcribe a voice query without running product search' })
  async transcribeVoice(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<VoiceTranscriptionResponseDto> {
    if (!file) {
      throw new HttpException('Audio file is required', HttpStatus.BAD_REQUEST);
    }

    return this.productsService.transcribeVoice(file.buffer, file.originalname);
  }

  @Get(':id/tryon-assets')
  @ApiOperation({ summary: 'Get active DeepAR try-on assets for a product' })
  findTryonAssets(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findTryonAssets(id);
  }

  @Post(':id/tryon-assets')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'effectFile', maxCount: 1 },
      { name: 'thumbnailFile', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Create a DeepAR try-on asset for a product' })
  async createTryonAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() createTryonAssetDto: CreateProductTryonAssetDto,
    @UploadedFiles()
    files?: {
      effectFile?: Express.Multer.File[];
      thumbnailFile?: Express.Multer.File[];
    },
  ) {
    const payload = await this.attachTryonAssetUploads(createTryonAssetDto, files);
    return this.productsService.createTryonAsset(id, payload);
  }

  @Patch(':id/tryon-assets/:assetId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'effectFile', maxCount: 1 },
      { name: 'thumbnailFile', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Update a DeepAR try-on asset for a product' })
  async updateTryonAsset(
    @Param('id', ParseIntPipe) id: number,
    @Param('assetId', ParseIntPipe) assetId: number,
    @Body() updateTryonAssetDto: UpdateProductTryonAssetDto,
    @UploadedFiles()
    files?: {
      effectFile?: Express.Multer.File[];
      thumbnailFile?: Express.Multer.File[];
    },
  ) {
    const payload = await this.attachTryonAssetUploads(updateTryonAssetDto, files);
    return this.productsService.updateTryonAsset(id, assetId, payload);
  }

  @Delete(':id/tryon-assets/:assetId')
  @ApiOperation({ summary: 'Soft delete a DeepAR try-on asset for a product' })
  removeTryonAsset(
    @Param('id', ParseIntPipe) id: number,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.productsService.removeTryonAsset(id, assetId);
  }

  @Get('tryon-effects/:encodedKey')
  @SkipTransform()
  @ApiOperation({ summary: 'Stream a stored DeepAR effect file' })
  async streamTryonEffect(
    @Param('encodedKey') encodedKey: string,
    @Res() response: Response,
  ) {
    // CORS is handled by the global enableCors() middleware in main.ts.
    // Do NOT manually set Access-Control-Allow-Origin here — overriding with '*'
    // conflicts with the global Allow-Credentials: true header and causes browser rejections.
    const key = this.decodeStorageKey(encodedKey);
    const file = await this.getTryonEffectFileStream(key);

    response.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (file.contentLength) {
      response.setHeader('Content-Length', String(file.contentLength));
    }

    file.body.pipe(response);
  }

  @Patch(':id/full')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'productImages', maxCount: 10 },
      { name: 'variantImages', maxCount: 100 },
    ]),
  )
  @ApiOperation({ summary: 'Update product with images and variants' })
  async updateFull(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductFullDto,
    @UploadedFiles()
    files?: {
      productImages?: Express.Multer.File[];
      variantImages?: Express.Multer.File[];
    },
  ) {
    const productImages: Array<{ imageUrl: string; publicId: string }> = [];
    if (files?.productImages?.length) {
      for (const file of files.productImages) {
        this.assertImageFile(file);
        const uploaded = await this.cloudinaryService.uploadFile(file);
        productImages.push({
          imageUrl: uploaded?.secure_url || '',
          publicId: uploaded?.public_id || '',
        });
      }
    }

    const variantImagesMap: Record<number, { imageUrl: string; publicId: string }> = {};
    if (files?.variantImages?.length) {
      for (let i = 0; i < files.variantImages.length; i++) {
        const file = files.variantImages[i];
        this.assertImageFile(file);
        const uploaded = await this.cloudinaryService.uploadFile(file);
        variantImagesMap[i] = {
          imageUrl: uploaded?.secure_url || '',
          publicId: uploaded?.public_id || '',
        };
      }
    }

    return this.productsService.updateFull(id, updateProductDto, productImages, variantImagesMap);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(InteractionInterceptor)
  @ApiOperation({ summary: 'Get a single product by ID with all images and variants' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {

    return this.productsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product and cascade soft delete all images and variants' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Post(':id/virtual-tryon')
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('personImage'))
  @ApiOperation({ summary: 'Virtual try-on 2D: upload person photo and get dressed result image' })
  async virtualTryon2D(
    @Param('id', ParseIntPipe) productId: number,
    @UploadedFile() personImage: Express.Multer.File,
    @Body('garmentDesc') garmentDesc?: string,
  ) {
    if (!personImage) {
      throw new BadRequestException('personImage file is required');
    }
    return this.productsService.virtualTryon2D(productId, personImage, garmentDesc);
  }

  private async attachTryonAssetUploads<T extends CreateProductTryonAssetDto | UpdateProductTryonAssetDto>(
    dto: T,
    files?: {
      effectFile?: Express.Multer.File[];
      thumbnailFile?: Express.Multer.File[];
    },
  ): Promise<T> {
    const payload = { ...dto };
    const effectFile = files?.effectFile?.[0];
    const thumbnailFile = files?.thumbnailFile?.[0];

    if (effectFile) {
      this.assertDeepAREffectFile(effectFile);
      payload.deeparEffectUrl = await this.uploadDeepAREffectFile(effectFile);
    }

    if (thumbnailFile) {
      this.assertImageFile(thumbnailFile);
      const uploaded = await this.uploadTryonFile(thumbnailFile, 'tryon/thumbnails', 'image', 'try-on thumbnail');
      if (!uploaded || !('secure_url' in uploaded) || !uploaded.secure_url) {
        throw new BadRequestException('Failed to upload try-on thumbnail');
      }
      payload.thumbnailUrl = uploaded.secure_url;
    }

    return payload;
  }

  private async uploadTryonFile(
    file: Express.Multer.File,
    folder: string,
    resourceType: 'image' | 'video' | 'raw' | 'auto',
    label: string,
  ) {
    try {
      return await this.cloudinaryService.uploadFileToFolder(file, folder, resourceType);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to upload ${label}: ${message}`);
    }
  }

  private async getTryonEffectFileStream(key: string) {
    try {
      return await this.minioService.getFileStream(key);
    } catch (error) {
      if (!(error instanceof NotFoundException) || !key.startsWith('tryon/effects/')) {
        throw error;
      }

      const legacyRootKey = key.split('/').pop();
      if (!legacyRootKey) {
        throw error;
      }

      return this.minioService.getFileStream(legacyRootKey);
    }
  }

  private async uploadDeepAREffectFile(file: Express.Multer.File) {
    const cloudinaryRawMaxSizeMb = Number(process.env.CLOUDINARY_RAW_MAX_MB || 10);
    const cloudinaryRawMaxSize = cloudinaryRawMaxSizeMb * 1024 * 1024;

    if (file.size <= cloudinaryRawMaxSize) {
      const uploaded = await this.uploadTryonFile(file, 'tryon/effects', 'raw', 'DeepAR effect file');
      if (!uploaded || !('secure_url' in uploaded) || !uploaded.secure_url) {
        throw new BadRequestException('Failed to upload DeepAR effect file');
      }
      return uploaded.secure_url;
    }

    const storageKey = this.buildTryonEffectStorageKey(file.originalname);
    try {
      await this.minioService.uploadBuffer(
        storageKey,
        file.buffer,
        file.mimetype || 'application/octet-stream',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to upload DeepAR effect file to object storage: ${message}`);
    }

    return `/api/v1/products/tryon-effects/${this.encodeStorageKey(storageKey)}`;
  }

  private buildTryonEffectStorageKey(originalName: string) {
    const safeName = originalName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'effect.deepar';
    return `tryon/effects/${randomUUID()}-${safeName}`;
  }

  private encodeStorageKey(key: string) {
    return Buffer.from(key, 'utf8').toString('base64url');
  }

  private decodeStorageKey(encodedKey: string) {
    try {
      const key = Buffer.from(encodedKey, 'base64url').toString('utf8');
      if (!key.startsWith('tryon/effects/')) {
        throw new Error('Invalid DeepAR effect key');
      }
      return key;
    } catch {
      throw new BadRequestException('Invalid DeepAR effect key');
    }
  }

  private assertDeepAREffectFile(file: Express.Multer.File) {
    const maxSizeMb = Number(process.env.DEEPAR_EFFECT_MAX_MB || 50);
    const maxSize = maxSizeMb * 1024 * 1024;
    const fileName = file.originalname.toLowerCase();
    const allowedMimeTypes = new Set([
      'application/octet-stream',
      'application/x-deepar',
      'model/vnd.deepar',
    ]);

    if (file.size > maxSize) {
      throw new BadRequestException(`DeepAR effect file must not exceed ${maxSizeMb}MB`);
    }

    if (!fileName.endsWith('.deepar') && !allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('DeepAR effect file must be a .deepar file');
    }
  }

  private assertImageFile(file: Express.Multer.File) {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Thumbnail image must not exceed 5MB');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Thumbnail file must be an image');
    }
  }
}
