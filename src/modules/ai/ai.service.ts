import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImageSearchResultDto, VoiceSearchResponseDto } from '../products/dtos';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      this.configService.get<string>('AI_SERVER_URL') ||
      'http://localhost:8000';
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
      };

      const products: ImageSearchResultDto[] = Array.isArray(raw.products)
        ? (raw.products as ImageSearchResultDto[])
        : [];

      const data: VoiceSearchResponseDto = {
        transcribed_text: typeof raw.transcribed_text === 'string' ? raw.transcribed_text : '',
        products,
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
}
