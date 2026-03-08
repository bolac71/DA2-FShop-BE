import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { AddressType } from "src/constants/address-type.enum";
import { BooleanOptional, PhoneNumberOptional, PhoneNumberRequired, StringOptional, StringRequired } from "src/decorators/dto.decorator";

export class UpdateAddressDto {
  @StringOptional()
  recipientName?: string;

  @PhoneNumberOptional('Recipient phone')
  recipientPhone?: string;

  @StringOptional()
  detailAddress?: string;

  @StringOptional()
  province?: string;

  @StringOptional()
  district?: string;

  @StringOptional()
  commune?: string;

  @IsEnum(AddressType)
  @IsOptional()
  @ApiProperty({ enum: AddressType, default: AddressType.HOME })
  type?: AddressType;

  @BooleanOptional()
  isDefault?: boolean;
}