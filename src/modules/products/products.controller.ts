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
  UpdateProductTryonAssetDto,
  VoiceSearchResponseDto,
  VoiceTranscriptionResponseDto,
} from './dtos';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

import { InteractionInterceptor } from '../user-interactions/interaction.interceptor';

@ApiTags('Products')
@Controller('products')
export class ProductsController {

  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
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

  @Post('virtual-tryon/outfit')
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('personImage'))
  @ApiOperation({ summary: 'Gemini AI outfit preview: upload person photo and apply up to 3 products' })
  async virtualTryonOutfit(
    @UploadedFile() personImage: Express.Multer.File,
    @Body('productIds') productIds: string | string[],
    @Body('stylePrompt') stylePrompt?: string,
  ) {
    if (!personImage) {
      throw new BadRequestException('personImage file is required');
    }
    const parsedProductIds = this.parseProductIds(productIds);
    return this.productsService.virtualTryonOutfit(personImage, parsedProductIds, stylePrompt);
  }

  private parseProductIds(productIds: string | string[] | undefined): number[] {
    const rawValues = Array.isArray(productIds) ? productIds : [productIds ?? ''];
    const values = rawValues.flatMap((value) => {
      const trimmed = String(value ?? '').trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
        } catch {
          throw new BadRequestException('productIds must be a JSON array or comma-separated list');
        }
      }
      return trimmed.split(',');
    });
    const ids = values.map((value) => Number(String(value).trim())).filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) {
      throw new BadRequestException('At least one productId is required');
    }
    return ids;
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
      const uploaded = await this.cloudinaryService.uploadFileToFolder(
        effectFile,
        'tryon/effects',
        'raw',
      );
      if (!uploaded || !('secure_url' in uploaded) || !uploaded.secure_url) {
        throw new BadRequestException('Failed to upload DeepAR effect file');
      }
      payload.deeparEffectUrl = uploaded.secure_url;
    }

    if (thumbnailFile) {
      this.assertImageFile(thumbnailFile);
      const uploaded = await this.cloudinaryService.uploadFileToFolder(
        thumbnailFile,
        'tryon/thumbnails',
        'image',
      );
      if (!uploaded || !('secure_url' in uploaded) || !uploaded.secure_url) {
        throw new BadRequestException('Failed to upload try-on thumbnail');
      }
      payload.thumbnailUrl = uploaded.secure_url;
    }

    return payload;
  }

  private assertDeepAREffectFile(file: Express.Multer.File) {
    const maxSize = 25 * 1024 * 1024;
    const fileName = file.originalname.toLowerCase();
    const allowedMimeTypes = new Set([
      'application/octet-stream',
      'application/x-deepar',
      'model/vnd.deepar',
    ]);

    if (file.size > maxSize) {
      throw new BadRequestException('DeepAR effect file must not exceed 25MB');
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
