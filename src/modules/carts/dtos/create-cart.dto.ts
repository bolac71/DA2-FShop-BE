import { NumberRequired } from 'src/decorators/dto.decorator';

export class CreateCartDto {
  @NumberRequired('UserId')
  userId: number;
}
