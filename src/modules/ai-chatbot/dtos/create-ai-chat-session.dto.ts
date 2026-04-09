import { StringOptional } from 'src/decorators/dto.decorator';

export class CreateAiChatSessionDto {
  @StringOptional()
  title?: string;
}
