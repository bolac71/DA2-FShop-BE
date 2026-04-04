import { IsIn, IsOptional } from 'class-validator';
import { NotificationType } from 'src/constants';
import { BooleanOptional } from 'src/decorators/dto.decorator';
import { QueryDto } from 'src/dtos';

export class AdminQueryNotificationDto extends QueryDto {
  @IsOptional()
  @IsIn(['id', 'createdAt', 'isRead'])
  declare sortBy?: 'id' | 'createdAt' | 'isRead';

  @IsOptional()
  @IsIn(Object.values(NotificationType))
  type?: NotificationType;

  @BooleanOptional()
  isRead?: boolean;
}
