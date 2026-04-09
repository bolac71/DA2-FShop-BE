import { StringRequired } from 'src/decorators/dto.decorator';

export class CreateCommentDto {
  @StringRequired('Content')
  content: string;
}
