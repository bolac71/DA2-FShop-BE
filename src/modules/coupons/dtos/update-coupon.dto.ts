import { IsEnum, IsDateString, IsOptional } from "class-validator";
import { CouponStatus, CouponType } from "src/constants";
import { StringOptional, NumberOptional, BooleanOptional } from "src/decorators/dto.decorator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateCouponDto {
  @StringOptional()
  @ApiProperty({ required: false, example: 'SUMMER2024', description: 'Unique coupon code' })
  code?: string;

  @StringOptional()
  @ApiProperty({ required: false, example: 'Summer Sale' })
  name?: string;

  @StringOptional()
  @ApiProperty({ required: false, example: 'Save up to 50% on selected items' })
  description?: string;

  @IsOptional()
  @IsEnum(CouponType, { message: 'Type must be one of: fixed, percent, shipping' })
  @ApiProperty({ enum: CouponType, required: false, example: CouponType.PERCENT })
  type?: CouponType;

  @NumberOptional()
  @ApiProperty({ required: false, example: 10, description: 'Discount value (fixed amount or percentage)' })
  value?: number;

  @NumberOptional()
  @ApiProperty({ required: false, example: 100000, description: 'Minimum order amount to apply coupon' })
  minOrderAmount?: number;

  @NumberOptional()
  @ApiProperty({ required: false, example: 50000, description: 'Maximum discount cap (for percent type)' })
  maxDiscountAmount?: number;

  @NumberOptional()
  @ApiProperty({ required: false, example: 100, description: '0 = unlimited' })
  maxUses?: number;

  @NumberOptional()
  @ApiProperty({ required: false, example: 2, description: '0 = unlimited per user' })
  perUserLimit?: number;

  @NumberOptional()
  @ApiProperty({ required: false, description: 'Applicable product ID (if scope is product)' })
  applicableProduct?: number;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  @ApiProperty({ required: false, example: '2024-06-01T00:00:00Z', description: 'Coupon start date (ISO 8601)' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  @ApiProperty({ required: false, example: '2024-08-31T23:59:59Z', description: 'Coupon end date (ISO 8601)' })
  endDate?: string;

  @IsOptional()
  @IsEnum(CouponStatus, { message: 'Status must be one of: active, expired, inactive' })
  @ApiProperty({ enum: CouponStatus, required: false, example: CouponStatus.ACTIVE })
  status?: CouponStatus;

  @BooleanOptional()
  @ApiProperty({ required: false, example: true, description: 'If true, visible to all users' })
  isPublic?: boolean;
}