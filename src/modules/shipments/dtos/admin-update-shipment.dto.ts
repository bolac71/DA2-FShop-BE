import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AdminUpdateShipmentStatusDto {
  @ApiProperty({
    description: 'Goship shipment status code (e.g. 900, 901, 902, 905, 910)',
    example: 902,
  })
  @IsNumber()
  statusCode: number;

  @ApiProperty({
    description: 'Goship status text description (e.g. "Chờ lấy hàng", "Đang giao", "Giao thành công")',
    example: 'Đang giao',
  })
  @IsString()
  statusText: string;

  @ApiProperty({
    description: 'Carrier waybill tracking code (GHTK/GHN tracking code)',
    required: false,
    example: 'GHTK_MOCK_123',
  })
  @IsString()
  @IsOptional()
  trackingCode?: string;

  @ApiProperty({ description: 'Carrier name', required: false })
  @IsString()
  @IsOptional()
  carrierName?: string;

  @ApiProperty({ description: 'Tracking URL link', required: false })
  @IsString()
  @IsOptional()
  trackingUrl?: string;

  @ApiProperty({ description: 'Current location of shipment', required: false })
  @IsString()
  @IsOptional()
  currentLocation?: string;

  @ApiProperty({ description: 'Shipper name', required: false })
  @IsString()
  @IsOptional()
  shipperName?: string;

  @ApiProperty({ description: 'Shipper phone', required: false })
  @IsString()
  @IsOptional()
  shipperPhone?: string;

  @ApiProperty({ description: 'Signee who received parcel', required: false })
  @IsString()
  @IsOptional()
  receivedBy?: string;

  @ApiProperty({ description: 'Cancellation reason', required: false })
  @IsString()
  @IsOptional()
  cancelReason?: string;
}
