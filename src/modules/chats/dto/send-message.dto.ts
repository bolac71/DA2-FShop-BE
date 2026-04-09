import { IsArray, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  conversationId: number;

  @IsString()
  @MinLength(1)
  @IsOptional()
  content?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const rawValues = Array.isArray(value)
      ? value
      : (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();

    return rawValues
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  })
  @IsInt({ each: true })
  productIds?: number[];
}
