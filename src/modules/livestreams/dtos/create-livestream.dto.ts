import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { StringOptional, StringRequired } from 'src/decorators/dto.decorator';

export class CreateLivestreamDto {
  @StringRequired('Title')
  title: string;

  @StringOptional()
  description?: string;

  @ApiProperty({ required: true, example: '2026-04-08T20:00:00.000Z' })
  @IsDateString()
  scheduledStartAt: string;
}
