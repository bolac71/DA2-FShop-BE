import { StringRequired } from 'src/decorators/dto.decorator';

export class CreateLivestreamCommentDto {
  @StringRequired('Content')
  content: string;
}
