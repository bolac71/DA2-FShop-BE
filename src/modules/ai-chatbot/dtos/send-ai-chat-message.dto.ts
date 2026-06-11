import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendAiChatMessageDto {
  @ApiProperty({ description: 'User message for AI chatbot' })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message can not be empty' })
  message: string;

  @ApiPropertyOptional({ description: 'How many recent messages are sent as history', default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'historyLimit must be an integer' })
  @Min(0)
  @Max(30)
  historyLimit?: number = 12;

  @ApiPropertyOptional({ description: 'Product IDs the user attached to ask about', type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Type(() => Number)
  @IsInt({ each: true })
  productIds?: number[];
}
