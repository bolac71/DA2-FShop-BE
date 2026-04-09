import { StringOptional, StringRequired } from 'src/decorators/dto.decorator';

export class UpdateCommentDto {
  @StringOptional()
  content: string;
}
