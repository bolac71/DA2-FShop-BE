import { IsString } from 'class-validator';
import { NumberRequired } from 'src/decorators/dto.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class AtmCardInfoDto {
  @ApiProperty({ example: '9704000000000018' })
  @IsString()
  cardNumber: string;

  @ApiProperty({ example: 'NGUYEN VAN A' })
  @IsString()
  cardFullName: string;

  @ApiProperty({ example: '03/07' })
  @IsString()
  cardIssueDate: string;
}

export class CreateAtmPaymentRequestDto {
  @NumberRequired('Order ID')
  orderId: number;

  @ApiProperty({ type: AtmCardInfoDto })
  cardInfo: AtmCardInfoDto;
}
