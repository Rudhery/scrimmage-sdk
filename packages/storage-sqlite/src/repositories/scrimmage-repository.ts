import { and, eq, isNull, lte, or, type SQL } from 'drizzle-orm';
import type {
  Scrimmage,
  ScrimmageFilter,
  ScrimmageRepository,
  ScrimmageStatus,
} from '@scrimmage/core';
import type { Db } from '../client.js';
import { scrimmages } from '../schema.js';

type ScrimmageRow = typeof scrimmages.$inferSelect;

function toScrimmage(row: ScrimmageRow): Scrimmage {
  const result =
    row.homeScore !== null && row.awayScore !== null
      ? { homeScore: row.homeScore, awayScore: row.awayScore }
      : null;

  return {
    id: row.id,
    guildId: row.guildId,
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    scheduledAt: row.scheduledAt,
    status: row.status as ScrimmageStatus,
    result,
    proposedBy: row.proposedBy,
    channelId: row.channelId,
    reminderSentAt: row.reminderSentAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleScrimmageRepository implements ScrimmageRepository {
  constructor(private readonly db: Db) {}

  async create(scrimmage: Scrimmage): Promise<Scrimmage> {
    this.db
      .insert(scrimmages)
      .values({
        id: scrimmage.id,
        guildId: scrimmage.guildId,
        homeTeamId: scrimmage.homeTeamId,
        awayTeamId: scrimmage.awayTeamId,
        scheduledAt: scrimmage.scheduledAt,
        status: scrimmage.status,
        homeScore: scrimmage.result?.homeScore ?? null,
        awayScore: scrimmage.result?.awayScore ?? null,
        proposedBy: scrimmage.proposedBy,
        channelId: scrimmage.channelId,
        reminderSentAt: scrimmage.reminderSentAt,
        createdAt: scrimmage.createdAt,
      })
      .run();
    return scrimmage;
  }

  async findById(guildId: string, id: string): Promise<Scrimmage | null> {
    const row = this.db
      .select()
      .from(scrimmages)
      .where(and(eq(scrimmages.id, id), eq(scrimmages.guildId, guildId)))
      .get();
    return row ? toScrimmage(row) : null;
  }

  async list(guildId: string, filter?: ScrimmageFilter): Promise<Scrimmage[]> {
    const conditions: SQL[] = [eq(scrimmages.guildId, guildId)];
    if (filter?.status) {
      conditions.push(eq(scrimmages.status, filter.status));
    }
    if (filter?.teamId) {
      const teamMatch = or(
        eq(scrimmages.homeTeamId, filter.teamId),
        eq(scrimmages.awayTeamId, filter.teamId),
      );
      if (teamMatch) {
        conditions.push(teamMatch);
      }
    }

    const rows = this.db
      .select()
      .from(scrimmages)
      .where(and(...conditions))
      .all();
    return rows.map(toScrimmage);
  }

  async update(scrimmage: Scrimmage): Promise<Scrimmage> {
    this.db
      .update(scrimmages)
      .set({
        scheduledAt: scrimmage.scheduledAt,
        status: scrimmage.status,
        homeScore: scrimmage.result?.homeScore ?? null,
        awayScore: scrimmage.result?.awayScore ?? null,
        channelId: scrimmage.channelId,
        reminderSentAt: scrimmage.reminderSentAt,
      })
      .where(and(eq(scrimmages.id, scrimmage.id), eq(scrimmages.guildId, scrimmage.guildId)))
      .run();
    return scrimmage;
  }

  async listDueReminders(before: Date): Promise<Scrimmage[]> {
    const rows = this.db
      .select()
      .from(scrimmages)
      .where(
        and(
          eq(scrimmages.status, 'confirmed'),
          isNull(scrimmages.reminderSentAt),
          lte(scrimmages.scheduledAt, before),
        ),
      )
      .all();
    return rows.map(toScrimmage);
  }
}
