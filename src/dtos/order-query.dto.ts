import { IsOptional, IsIn } from "class-validator";
import { QueryDto } from "./query.dto";
import { OrderStatus } from "src/constants";
import { ApiProperty } from "@nestjs/swagger";

export class OrderQueryDto extends QueryDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  @ApiProperty({ enum: OrderStatus, required: false })
  status?: OrderStatus;
}