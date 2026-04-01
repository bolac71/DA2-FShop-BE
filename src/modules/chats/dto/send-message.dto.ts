import { IsInt, IsString, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  conversationId: number;

  @IsString()
  @MinLength(1)
  @IsOptional()
  content?: string;
}
