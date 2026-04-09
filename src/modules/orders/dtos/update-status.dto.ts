/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { OrderStatus } from "src/constants";
import { StringOptional } from "src/decorators/dto.decorator";

export class UpdateOrderStatusDto {
  @Transform(({ value }) => String(value).toLowerCase())
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus

  @StringOptional()
  reason?: string
}