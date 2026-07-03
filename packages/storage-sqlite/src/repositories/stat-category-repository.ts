import { and, eq } from 'drizzle-orm';
import type { StatCategory, StatCategoryRepository } from '@scrimmage/core';
import type { Db } from '../client.js';
import { statCategories } from '../schema.js';

export class DrizzleStatCategoryRepository implements StatCategoryRepository {
  constructor(private readonly db: Db) {}

  async list(guildId: string): Promise<StatCategory[]> {
    return this.db.select().from(statCategories).where(eq(statCategories.guildId, guildId)).all();
  }

  async upsert(category: StatCategory): Promise<void> {
    this.db
      .insert(statCategories)
      .values(category)
      .onConflictDoUpdate({
        target: [statCategories.guildId, statCategories.key],
        set: { label: category.label, weight: category.weight, position: category.position },
      })
      .run();
  }

  async remove(guildId: string, key: string): Promise<void> {
    this.db
      .delete(statCategories)
      .where(and(eq(statCategories.guildId, guildId), eq(statCategories.key, key)))
      .run();
  }
}
