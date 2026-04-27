import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUrl } from 'class-validator';
import { BooleanOptional, NumberOptional, StringOptional, StringRequired } from 'src/decorators/dto.decorator';
import { ProductTryonAssetType } from '../entities/product-tryon-asset.entity';

export class CreateProductTryonAssetDto {
  @IsOptional()
  @NumberOptional()
  @ApiProperty({ required: false, example: 1 })
  variantId?: number;

  @IsEnum(ProductTryonAssetType, {
    message: 'Asset type must be one of: glasses, hat, accessory',
  })
  @ApiProperty({ enum: ProductTryonAssetType, example: ProductTryonAssetType.GLASSES })
  assetType: ProductTryonAssetType;

  @StringRequired('Display name')
  @ApiProperty({ example: 'Classic black glasses' })
  displayName: string;

  @IsUrl({ require_protocol: true }, { message: 'DeepAR effect URL must be a valid URL' })
  @ApiProperty({ example: 'https://cdn.example.com/effects/glasses.deepar' })
  deeparEffectUrl: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'Thumbnail URL must be a valid URL' })
  @StringOptional()
  @ApiProperty({ required: false, example: 'https://cdn.example.com/effects/glasses.png' })
  thumbnailUrl?: string;

  @IsOptional()
  @BooleanOptional()
  @ApiProperty({ required: false, example: true })
  isActive?: boolean;
}

export class UpdateProductTryonAssetDto {
  @IsOptional()
  @NumberOptional()
  @ApiProperty({ required: false, example: 1 })
  variantId?: number | null;

  @IsOptional()
  @IsEnum(ProductTryonAssetType, {
    message: 'Asset type must be one of: glasses, hat, accessory',
  })
  @ApiProperty({ enum: ProductTryonAssetType, required: false })
  assetType?: ProductTryonAssetType;

  @StringOptional()
  @ApiProperty({ required: false, example: 'Classic black glasses' })
  displayName?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'DeepAR effect URL must be a valid URL' })
  @ApiProperty({ required: false, example: 'https://cdn.example.com/effects/glasses.deepar' })
  deeparEffectUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'Thumbnail URL must be a valid URL' })
  @StringOptional()
  @ApiProperty({ required: false, example: 'https://cdn.example.com/effects/glasses.png' })
  thumbnailUrl?: string | null;

  @IsOptional()
  @BooleanOptional()
  @ApiProperty({ required: false, example: true })
  isActive?: boolean;
}
