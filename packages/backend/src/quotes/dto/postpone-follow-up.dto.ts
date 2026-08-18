import { IsInt, Max, Min } from 'class-validator';

/** POST /quotes/:id/postpone-follow-up. */
export class PostponeFollowUpDto {
  /** Días desde HOY a los que se recalcula followUpAt. */
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;
}
