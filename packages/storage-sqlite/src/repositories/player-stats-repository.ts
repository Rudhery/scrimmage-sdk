import { eq } from 'drizzle-orm';
import type { PlayerStatLine, PlayerStatsRepository } from '@scrimmage/core';
import type { Db } from '../client.js';
import { playerStats } from '../schema.js';

type PlayerStatsRow = typeof playerStats.$inferSelect;

function toLine(row: PlayerStatsRow): PlayerStatLine {
  return {
    scrimmageId: row.scrimmageId,
    guildId: row.guildId,
    teamId: row.teamId,
    userId: row.userId,
    values: JSON.parse(row.values) as Record<string, number>,
  };
}

export class DrizzlePlayerStatsRepository implements PlayerStatsRepository {
  constructor(private readonly db: Db) {}

  async set(line: PlayerStatLine): Promise<void> {
    const values = JSON.stringify(line.values);
    this.db
      .insert(playerStats)
      .values({
        scrimmageId: line.scrimmageId,
        guildId: line.guildId,
        teamId: line.teamId,
        userId: line.userId,
        values,
      })
      .onConflictDoUpdate({
        target: [playerStats.scrimmageId, playerStats.userId],
        set: { teamId: line.teamId, values },
      })
      .run();
  }

  async listByScrimmage(scrimmageId: string): Promise<PlayerStatLine[]> {
    return this.db
      .select()
      .from(playerStats)
      .where(eq(playerStats.scrimmageId, scrimmageId))
      .all()
      .map(toLine);
  }

  async listByGuild(guildId: string): Promise<PlayerStatLine[]> {
    return this.db
      .select()
      .from(playerStats)
      .where(eq(playerStats.guildId, guildId))
      .all()
      .map(toLine);
  }
}
