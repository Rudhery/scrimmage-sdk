/** Lifecycle of a championship. */
export const ChampionshipStatus = {
  /** Created, teams being seeded; the bracket has not been drawn yet. */
  Draft: 'draft',
  /** Bracket drawn; matches are being played. */
  Active: 'active',
  /** The final has been decided. */
  Completed: 'completed',
} as const;

export type ChampionshipStatus = (typeof ChampionshipStatus)[keyof typeof ChampionshipStatus];

/** Bracket format. Only single-elimination for now; kept for future formats. */
export const ChampionshipFormat = {
  SingleElimination: 'single_elimination',
} as const;

export type ChampionshipFormat = (typeof ChampionshipFormat)[keyof typeof ChampionshipFormat];

/** State of a bracket match. */
export const MatchStatus = {
  Pending: 'pending',
  Played: 'played',
} as const;

export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

/** A volleyball championship running between two dates. */
export interface Championship {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly format: ChampionshipFormat;
  /** Sets needed to win a match is derived from this (best-of-3 or best-of-5). */
  readonly bestOf: number;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: ChampionshipStatus;
  readonly createdAt: Date;
}

/** A team entered into a championship, with its bracket seed (1 = strongest). */
export interface ChampionshipTeam {
  readonly championshipId: string;
  readonly teamId: string;
  readonly seed: number;
}

/**
 * One match in a single-elimination bracket. Matches form a binary tree:
 * the winner of `(round, position)` advances into `nextMatchId`, taking the
 * home slot when `position` is even and the away slot when it is odd.
 */
export interface Match {
  readonly id: string;
  readonly championshipId: string;
  /** 1 = first round; increases toward the final. */
  readonly round: number;
  /** 0-based position of the match within its round. */
  readonly position: number;
  readonly homeTeamId: string | null;
  readonly awayTeamId: string | null;
  readonly winnerTeamId: string | null;
  readonly status: MatchStatus;
  /** The match the winner advances to, or `null` for the final. */
  readonly nextMatchId: string | null;
  readonly createdAt: Date;
}

/** The score of a single set within a match. */
export interface MatchSet {
  readonly matchId: string;
  readonly setNumber: number;
  readonly homeScore: number;
  readonly awayScore: number;
}

/** Sets needed to win a best-of-N match. */
export function setsToWin(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}
