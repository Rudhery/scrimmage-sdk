/**
 * Lifecycle of a scrimmage (friendly match).
 *
 * ```
 * proposed ──confirm──▶ confirmed ──result──▶ played
 *    │                      │
 *    └────────cancel────────┴──────────▶ cancelled
 * ```
 */
export const ScrimmageStatus = {
  Proposed: 'proposed',
  Confirmed: 'confirmed',
  Cancelled: 'cancelled',
  Played: 'played',
} as const;

export type ScrimmageStatus = (typeof ScrimmageStatus)[keyof typeof ScrimmageStatus];

/** Final score of a played scrimmage, from the home team's perspective. */
export interface ScrimmageResult {
  readonly homeScore: number;
  readonly awayScore: number;
}

/** A scheduled friendly match between two teams of the same guild. */
export interface Scrimmage {
  readonly id: string;
  readonly guildId: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  /** When the match is scheduled to be played. */
  readonly scheduledAt: Date;
  readonly status: ScrimmageStatus;
  /** Recorded result, or `null` while the match has not been played. */
  readonly result: ScrimmageResult | null;
  /** Discord user id of whoever proposed the match. */
  readonly proposedBy: string;
  /** Channel the match was proposed in, used to post the pre-game reminder. */
  readonly channelId: string | null;
  /** When the pre-game reminder was sent, or `null` if not yet sent. */
  readonly reminderSentAt: Date | null;
  readonly createdAt: Date;
}
