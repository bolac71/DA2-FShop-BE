import { IsInt, Min } from 'class-validator';

export class SubmitVoteDto {
  @IsInt()
  @Min(1)
  pollId: number;

  @IsInt()
  @Min(0)
  optionIndex: number;
}
