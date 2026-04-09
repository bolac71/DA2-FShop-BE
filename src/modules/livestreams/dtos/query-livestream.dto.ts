import { IsIn, IsOptional } from 'class-validator';
import { QueryDto } from 'src/dtos';
import { LivestreamStatus } from 'src/constants';

export class QueryLivestreamDto extends QueryDto {
  @IsOptional()
  @IsIn([LivestreamStatus.SCHEDULED, LivestreamStatus.LIVE, LivestreamStatus.ENDED])
  status?: LivestreamStatus;
}
