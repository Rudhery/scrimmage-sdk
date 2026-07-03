import { eq } from 'drizzle-orm';
import type { BotPresence, BotPresenceRepository } from '@scrimmage/core';
import type { Db } from '../client.js';
import { botPresence } from '../schema.js';

export class DrizzleBotPresenceRepository implements BotPresenceRepository {
  constructor(private readonly db: Db) {}

  async heartbeat(guildIds: string[], at: Date): Promise<void> {
    for (const guildId of guildIds) {
      this.db
        .insert(botPresence)
        .values({ guildId, lastSeenAt: at })
        .onConflictDoUpdate({ target: botPresence.guildId, set: { lastSeenAt: at } })
        .run();
    }
  }

  async get(guildId: string): Promise<BotPresence | null> {
    const row = this.db.select().from(botPresence).where(eq(botPresence.guildId, guildId)).get();
    return row ? { guildId: row.guildId, lastSeenAt: row.lastSeenAt } : null;
  }
}
