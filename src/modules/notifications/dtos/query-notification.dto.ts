import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { NotificationType } from 'src/constants';
import { BooleanOptional, StringOptional } from 'src/decorators/dto.decorator';
import { QueryDto } from 'src/dtos';

export class QueryNotificationDto extends QueryDto {
  @IsOptional()
  @IsIn(['createdAt', 'isRead'])
  declare sortBy?: 'createdAt' | 'isRead';

  @IsOptional()
  @IsIn(Object.values(NotificationType))
  type?: NotificationType;

  @BooleanOptional()
  isRead?: boolean;
}
