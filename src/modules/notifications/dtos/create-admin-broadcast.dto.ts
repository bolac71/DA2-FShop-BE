import { IsEnum } from 'class-validator';
import { NotificationType } from 'src/constants';
import { StringRequired } from 'src/decorators/dto.decorator';

export class CreateAdminBroadcastDto {
  @StringRequired('title')
  title: string;

  @StringRequired('message')
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;
}
