import { StringRequired } from 'src/decorators/dto.decorator';
import type { ImageSearchResultDto } from './image-search.dto';

export class VoiceSearchResponseDto {
  @StringRequired("Transcribed text")
  transcribed_text: string;

  products: ImageSearchResultDto[];
}
