import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImageSearchResultDto, VoiceSearchResponseDto, VoiceTranscriptionResponseDto } from '../products/dtos';

export interface AiChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatSessionState {
  active_product_id?: number | null;
  active_product_name?: string | null;
  active_category?: string | null;
  active_brand?: string | null;
  last_intent?: string | null;
  last_entities?: Record<string, unknown>;
}

export interface AiChatProductItem {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  brand?: string;
  category_department?: string;
}

export interface AiChatResponse {
  answer: string;
  products: AiChatProductItem[];
  session_state?: AiChatSessionState | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;
  private readonly aiChatTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      this.configService.get<string>('AI_SERVER_URL') ||
      'http://localhost:8000';

    const configuredTimeout = Number(this.configService.get<string>('AI_CHAT_TIMEOUT_MS') || '45000');
    this.aiChatTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : 45000;
  }

  async askChatbot(
    question: string,
    history: AiChatHistoryItem[],
    userId: number,
    sessionState?: AiChatSessionState | null,
  ): Promise<AiChatResponse> {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      throw new HttpException('Question is required', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.debug(`Sending chatbot request to AI service: ${this.aiServiceUrl}/chat/ask`);

      const response = await fetch(`${this.aiServiceUrl}/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: normalizedQuestion,
          history,
          user_id: userId,
          session_state: sessionState ?? null,
        }),
        signal: AbortSignal.timeout(this.aiChatTimeoutMs),
      });

      if (!response.ok) {
        throw new Error(`AI service returned status ${response.status}`);
      }

      const raw = (await response.json()) as {
        answer?: unknown;
        products?: unknown;
        session_state?: unknown;
      };

      const answer = typeof raw.answer === 'string'
        ? raw.answer
        : 'He thong dang ban, vui long thu lai sau.';

      const products = Array.isArray(raw.products)
        ? (raw.products as AiChatProductItem[])
        : [];

      const parsedSessionState = raw.session_state && typeof raw.session_state === 'object'
        ? (raw.session_state as AiChatSessionState)
        : null;

      return {
        answer,
        products,
        session_state: parsedSessionState,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Chatbot request failed: ${errorMessage}`);

      if (errorMessage.includes('timeout')) {
        throw new HttpException(
          'Chatbot timeout. Please try again in a moment.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        throw new HttpException(
          'AI chatbot service is currently unavailable. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'Failed to get chatbot response. Please try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async searchByImage(
    fileBuffer: Buffer,
    fileName: string,
    topK: number = 12,
  ): Promise<ImageSearchResultDto[]> {
    try {
      const formData = new FormData();
      const uint8Array = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8Array]);
      formData.append('file', blob, fileName);
      formData.append('top_k', String(topK));

      this.logger.debug(`Sending image search request to AI service: ${this.aiServiceUrl}/search/image`);

      const response = await fetch(`${this.aiServiceUrl}/search/image`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`AI service returned status ${response.status}`);
      }

      const data: ImageSearchResultDto[] = await response.json();
      this.logger.debug(`Image search completed, found ${data.length} results`);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Image search failed: ${errorMessage}`);

      if (errorMessage.includes('timeout')) {
        throw new HttpException(
          'Image processing timeout. Please try again with a smaller image.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        throw new HttpException(
          'AI service is currently unavailable. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'Image processing failed. Please try again with a different image.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async searchByVoice(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<VoiceSearchResponseDto> {
    try {
      const formData = new FormData();
      const uint8Array = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8Array]);
      formData.append('file', blob, fileName);

      this.logger.debug(`Sending voice search request to AI service: ${this.aiServiceUrl}/search/voice`);

      const response = await fetch(`${this.aiServiceUrl}/search/voice`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) 
        throw new HttpException(`AI service returned status ${response.status}`, HttpStatus.BAD_GATEWAY);

      const raw = (await response.json()) as {
        transcribed_text?: unknown;
        products?: unknown;
        normalized_query?: unknown;
        rewritten_query?: unknown;
        intent?: unknown;
        filters?: unknown;
        asr_confidence?: unknown;
        asr?: unknown;
        latency_ms?: unknown;
        search_debug?: unknown;
      };

      const products: ImageSearchResultDto[] = Array.isArray(raw.products)
        ? (raw.products as ImageSearchResultDto[])
        : [];

      const data: VoiceSearchResponseDto = {
        transcribed_text: typeof raw.transcribed_text === 'string' ? raw.transcribed_text : '',
        products,
        normalized_query: typeof raw.normalized_query === 'string' ? raw.normalized_query : undefined,
        rewritten_query: typeof raw.rewritten_query === 'string' ? raw.rewritten_query : undefined,
        intent: typeof raw.intent === 'string' ? raw.intent : undefined,
        filters: raw.filters && typeof raw.filters === 'object'
          ? (raw.filters as Record<string, unknown>)
          : undefined,
        asr_confidence: typeof raw.asr_confidence === 'number' ? raw.asr_confidence : undefined,
        asr: raw.asr && typeof raw.asr === 'object'
          ? (raw.asr as VoiceSearchResponseDto['asr'])
          : undefined,
        latency_ms: typeof raw.latency_ms === 'number' ? raw.latency_ms : undefined,
        search_debug: raw.search_debug && typeof raw.search_debug === 'object'
          ? (raw.search_debug as Record<string, unknown>)
          : raw.search_debug === null
            ? null
            : undefined,
      };

      this.logger.debug(`Voice search completed, found ${products.length} results`);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Voice search failed: ${errorMessage}`);

      if (errorMessage.includes('timeout')) {
        throw new HttpException(
          'Voice processing timeout. Please try again with a shorter audio clip.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        throw new HttpException(
          'AI service is currently unavailable. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'Voice processing failed. Please try recording again.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async transcribeVoice(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<VoiceTranscriptionResponseDto> {
    try {
      const formData = new FormData();
      const uint8Array = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8Array]);
      formData.append('file', blob, fileName);

      this.logger.debug(`Sending voice transcription request to AI service: ${this.aiServiceUrl}/transcribe/voice`);

      const response = await fetch(`${this.aiServiceUrl}/transcribe/voice`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok)
        throw new HttpException(`AI service returned status ${response.status}`, HttpStatus.BAD_GATEWAY);

      const raw = (await response.json()) as {
        transcribed_text?: unknown;
        normalized_query?: unknown;
        rewritten_query?: unknown;
        intent?: unknown;
        filters?: unknown;
        asr_confidence?: unknown;
        asr?: unknown;
        latency_ms?: unknown;
        search_debug?: unknown;
      };

      return {
        transcribed_text: typeof raw.transcribed_text === 'string' ? raw.transcribed_text : '',
        normalized_query: typeof raw.normalized_query === 'string' ? raw.normalized_query : undefined,
        rewritten_query: typeof raw.rewritten_query === 'string' ? raw.rewritten_query : undefined,
        intent: typeof raw.intent === 'string' ? raw.intent : undefined,
        filters: raw.filters && typeof raw.filters === 'object'
          ? (raw.filters as Record<string, unknown>)
          : undefined,
        asr_confidence: typeof raw.asr_confidence === 'number' ? raw.asr_confidence : undefined,
        asr: raw.asr && typeof raw.asr === 'object'
          ? (raw.asr as VoiceTranscriptionResponseDto['asr'])
          : undefined,
        latency_ms: typeof raw.latency_ms === 'number' ? raw.latency_ms : undefined,
        search_debug: raw.search_debug && typeof raw.search_debug === 'object'
          ? (raw.search_debug as Record<string, unknown>)
          : raw.search_debug === null
            ? null
            : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Voice transcription failed: ${errorMessage}`);

      if (errorMessage.includes('timeout')) {
        throw new HttpException(
          'Voice transcription timeout. Please try again with a shorter audio clip.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        throw new HttpException(
          'AI service is currently unavailable. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'Voice transcription failed. Please try recording again.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
