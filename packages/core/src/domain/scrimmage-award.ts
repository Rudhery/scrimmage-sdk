/** The three per-match MVP titles. */
export const AwardCategory = {
  Offensive: 'offensive',
  Defensive: 'defensive',
  Overall: 'overall',
} as const;

export type AwardCategory = (typeof AwardCategory)[keyof typeof AwardCategory];

/** A per-scrimmage MVP award: one player holds one title for a match. */
export interface ScrimmageAward {
  readonly scrimmageId: string;
  readonly category: AwardCategory;
  readonly userId: string;
}
