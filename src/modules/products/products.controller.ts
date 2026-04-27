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
import { ApiOperation, ApiTags, ApiConsumes, ApiNotFoundResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  CreateProductTryonAssetDto,
  ImageSearchDto,
  ImageSearchResultDto,
  UpdateProductTryonAssetDto,
  VoiceSearchResponseDto,
} from './dtos';
import { QueryDto } from 'src/dtos/query.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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
  findAll(@Query() query: QueryDto) {
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

  @Get(':id/tryon-assets')
  @ApiOperation({ summary: 'Get active DeepAR try-on assets for a product' })
  findTryonAssets(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findTryonAssets(id);
  }

  @Post(':id/tryon-assets')
  @ApiOperation({ summary: 'Create a DeepAR try-on asset for a product' })
  createTryonAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() createTryonAssetDto: CreateProductTryonAssetDto,
  ) {
    return this.productsService.createTryonAsset(id, createTryonAssetDto);
  }

  @Patch(':id/tryon-assets/:assetId')
  @ApiOperation({ summary: 'Update a DeepAR try-on asset for a product' })
  updateTryonAsset(
    @Param('id', ParseIntPipe) id: number,
    @Param('assetId', ParseIntPipe) assetId: number,
    @Body() updateTryonAssetDto: UpdateProductTryonAssetDto,
  ) {
    return this.productsService.updateTryonAsset(id, assetId, updateTryonAssetDto);
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
}
