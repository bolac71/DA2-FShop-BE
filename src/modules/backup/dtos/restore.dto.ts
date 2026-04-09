import { StringRequired } from 'src/decorators/dto.decorator';

export class RestoreDto {
  @StringRequired('filename')
  filename: string;
}
