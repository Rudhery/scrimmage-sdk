import { z } from 'zod';
import type { PlayerAggregate, PlayerStatLine } from '../domain/stats.js';
import type { PlayerStatsRepository } from '../storage/repositories.js';
import { ValidationError } from '../errors/index.js';
import { parse } from '../validation.js';
import type { StatCategoryService } from './stat-category-service.js';

const valueSchema = z.number().int().min(0).max(100_000);

export interface RecordStatsInput {
  guildId: string;
  scrimmageId: string;
  teamId: string;
  userId: string;
  values: Record<string, number>;
}

export interface SetStatInput {
  guildId: string;
  scrimmageId: string;
  teamId: string;
  userId: string;
  key: string;
  value: number;
}

/** Optional filter for aggregation (e.g. restrict to a season's scrimmages). */
export interface AggregateFilter {
  scrimmageIds?: ReadonlySet<string>;
}

/** Records per-player stat lines and aggregates them into leaderboards / MVP. */
export class PlayerStatsService {
  constructor(
    private readonly stats: PlayerStatsRepository,
    private readonly categories: StatCategoryService,
  ) {}

  /** Record (or replace) a player's stat line for a scrimmage. */
  async record(input: RecordStatsInput): Promise<PlayerStatLine> {
    const allowed = new Set((await this.categories.list(input.guildId)).map((c) => c.key));
    const values: Record<string, number> = {};
    for (const [key, value] of Object.entries(input.values)) {
      if (!allowed.has(key)) {
        throw new ValidationError(`Unknown stat category "${key}".`);
      }
      values[key] = parse(valueSchema, value);
    }
    const line: PlayerStatLine = {
      scrimmageId: input.scrimmageId,
      guildId: input.guildId,
      teamId: input.teamId,
      userId: input.userId,
      values,
    };
    await this.stats.set(line);
    return line;
  }

  /** Set a single stat for a player, merging with their existing line. */
  async setStat(input: SetStatInput): Promise<PlayerStatLine> {
    const allowed = new Set((await this.categories.list(input.guildId)).map((c) => c.key));
    if (!allowed.has(input.key)) {
      throw new ValidationError(`Unknown stat category "${input.key}".`);
    }
    const value = parse(valueSchema, input.value);
    const existing = (await this.stats.listByScrimmage(input.scrimmageId)).find(
      (line) => line.userId === input.userId,
    );
    const line: PlayerStatLine = {
      scrimmageId: input.scrimmageId,
      guildId: input.guildId,
      teamId: input.teamId,
      userId: input.userId,
      values: { ...(existing?.values ?? {}), [input.key]: value },
    };
    await this.stats.set(line);
    return line;
  }

  forScrimmage(scrimmageId: string): Promise<PlayerStatLine[]> {
    return this.stats.listByScrimmage(scrimmageId);
  }

  /** Weighted leaderboard for a guild, best player first. */
  async leaderboard(guildId: string, filter?: AggregateFilter): Promise<PlayerAggregate[]> {
    const weights = new Map((await this.categories.list(guildId)).map((c) => [c.key, c.weight]));
    const lines = await this.stats.listByGuild(guildId);

    const byUser = new Map<string, { totals: Record<string, number>; appearances: number }>();
    for (const line of lines) {
      if (filter?.scrimmageIds && !filter.scrimmageIds.has(line.scrimmageId)) {
        continue;
      }
      const entry = byUser.get(line.userId) ?? { totals: {}, appearances: 0 };
      entry.appearances += 1;
      for (const [key, value] of Object.entries(line.values)) {
        entry.totals[key] = (entry.totals[key] ?? 0) + value;
      }
      byUser.set(line.userId, entry);
    }

    const aggregates: PlayerAggregate[] = [...byUser.entries()].map(([userId, entry]) => ({
      userId,
      appearances: entry.appearances,
      totals: entry.totals,
      score: Object.entries(entry.totals).reduce(
        (sum, [key, value]) => sum + value * (weights.get(key) ?? 0),
        0,
      ),
    }));

    aggregates.sort(
      (a, b) =>
        b.score - a.score || b.appearances - a.appearances || a.userId.localeCompare(b.userId),
    );
    return aggregates;
  }

  async mvp(guildId: string, filter?: AggregateFilter): Promise<PlayerAggregate | null> {
    return (await this.leaderboard(guildId, filter))[0] ?? null;
  }

  async forPlayer(guildId: string, userId: string): Promise<PlayerAggregate | null> {
    return (await this.leaderboard(guildId)).find((entry) => entry.userId === userId) ?? null;
  }
}
