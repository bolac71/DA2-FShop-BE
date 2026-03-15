import { BooleanOptional } from "src/decorators/dto.decorator";

export class VoteReviewDto {
  @BooleanOptional()
  isHelpful: boolean;
}