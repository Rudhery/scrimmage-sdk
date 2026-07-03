/**
 * A configurable, per-guild statistic category (e.g. "Spikes"). The `weight`
 * controls how much the stat contributes to a player's overall MVP score.
 */
export interface StatCategory {
  readonly guildId: string;
  /** Stable slug used as the key in stat lines, e.g. `spike`. */
  readonly key: string;
  /** Human-readable label, e.g. `Spikes`. */
  readonly label: string;
  /** Contribution per unit to the MVP score. */
  readonly weight: number;
  /** Display/order position. */
  readonly position: number;
}

/** One player's stat line for a single scrimmage. */
export interface PlayerStatLine {
  readonly scrimmageId: string;
  readonly guildId: string;
  readonly teamId: string;
  readonly userId: string;
  /** Recorded values keyed by {@link StatCategory.key}. */
  readonly values: Readonly<Record<string, number>>;
}

/** A player's totals across scrimmages plus their weighted MVP score. */
export interface PlayerAggregate {
  readonly userId: string;
  /** Number of scrimmages the player has a stat line in. */
  readonly appearances: number;
  readonly totals: Readonly<Record<string, number>>;
  readonly score: number;
}

/** Default volleyball (Haikyuu-style) stat categories, used when a guild has none. */
export const VOLLEYBALL_PRESET: ReadonlyArray<Omit<StatCategory, 'guildId'>> = [
  { key: 'points', label: 'Points', weight: 1, position: 0 },
  { key: 'spike', label: 'Spikes', weight: 0.8, position: 1 },
  { key: 'block', label: 'Blocks', weight: 1, position: 2 },
  { key: 'reception', label: 'Receptions', weight: 0.5, position: 3 },
  { key: 'ace', label: 'Aces', weight: 1.2, position: 4 },
  { key: 'synergy', label: 'Synergy', weight: 0.6, position: 5 },
];
