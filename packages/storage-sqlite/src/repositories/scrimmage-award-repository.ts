import { and, eq } from 'drizzle-orm';
import type { AwardCategory, ScrimmageAward, ScrimmageAwardRepository } from '@scrimmage/core';
import type { Db } from '../client.js';
import { scrimmageAwards } from '../schema.js';

export class DrizzleScrimmageAwardRepository implements ScrimmageAwardRepository {
  constructor(private readonly db: Db) {}

  async set(award: ScrimmageAward): Promise<void> {
    this.db
      .insert(scrimmageAwards)
      .values(award)
      .onConflictDoUpdate({
        target: [scrimmageAwards.scrimmageId, scrimmageAwards.category],
        set: { userId: award.userId },
      })
      .run();
  }

  async remove(scrimmageId: string, category: AwardCategory): Promise<void> {
    this.db
      .delete(scrimmageAwards)
      .where(
        and(eq(scrimmageAwards.scrimmageId, scrimmageId), eq(scrimmageAwards.category, category)),
      )
      .run();
  }

  async listByScrimmage(scrimmageId: string): Promise<ScrimmageAward[]> {
    return this.db
      .select()
      .from(scrimmageAwards)
      .where(eq(scrimmageAwards.scrimmageId, scrimmageId))
      .all()
      .map((row) => ({
        scrimmageId: row.scrimmageId,
        category: row.category as AwardCategory,
        userId: row.userId,
      }));
  }
}
