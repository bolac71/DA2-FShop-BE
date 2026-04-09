import { ApiProperty } from '@nestjs/swagger';
import { IsEmpty, IsOptional, IsString } from 'class-validator';
import { StringOptional } from 'src/decorators/dto.decorator';

export class UpdateMeDto {
  @StringOptional()
  fullName?: string;

  @IsEmpty({ message: 'Email cannot be updated via this endpoint' })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar file',
    required: false,
  })
  avatar?: string;
}