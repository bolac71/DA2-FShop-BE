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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags, ApiConsumes, ApiNotFoundResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos';
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
