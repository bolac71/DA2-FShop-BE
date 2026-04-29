import { StringRequired } from 'src/decorators/dto.decorator';
import type { ImageSearchResultDto } from './image-search.dto';

export interface VoiceAsrMetadataDto {
  language?: string;
  language_probability?: number;
  avg_logprob?: number;
  no_speech_probability?: number;
  confidence?: number;
  model?: string;
  device?: string;
  compute_type?: string;
}

export class VoiceSearchResponseDto {
  @StringRequired("Transcribed text")
  transcribed_text: string;

  products: ImageSearchResultDto[];

  normalized_query?: string;
  rewritten_query?: string;
  intent?: string;
  filters?: Record<string, unknown>;
  asr_confidence?: number;
  asr?: VoiceAsrMetadataDto;
  latency_ms?: number;
  search_debug?: Record<string, unknown> | null;
}

export class VoiceTranscriptionResponseDto {
  @StringRequired("Transcribed text")
  transcribed_text: string;

  normalized_query?: string;
  rewritten_query?: string;
  intent?: string;
  filters?: Record<string, unknown>;
  asr_confidence?: number;
  asr?: VoiceAsrMetadataDto;
  latency_ms?: number;
  search_debug?: Record<string, unknown> | null;
}
