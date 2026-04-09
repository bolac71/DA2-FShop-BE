import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { CouponType } from "src/constants";
import { QueryDto } from "src/dtos";

export class QueryCouponDto extends QueryDto {
  @ApiPropertyOptional({
    enum: CouponType,
    description: 'Coupon type',
  })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;
}