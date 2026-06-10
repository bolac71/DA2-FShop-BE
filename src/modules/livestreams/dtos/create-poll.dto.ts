import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class CreatePollDto {
  @IsString()
  @MaxLength(500)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];
}
