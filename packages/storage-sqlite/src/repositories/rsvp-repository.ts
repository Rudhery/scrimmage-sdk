import { eq } from 'drizzle-orm';
import type { Rsvp, RsvpRepository, RsvpStatus } from '@scrimmage/core';
import type { Db } from '../client.js';
import { rsvps } from '../schema.js';

export class DrizzleRsvpRepository implements RsvpRepository {
  constructor(private readonly db: Db) {}

  async set(rsvp: Rsvp): Promise<void> {
    this.db
      .insert(rsvps)
      .values(rsvp)
      .onConflictDoUpdate({
        target: [rsvps.scrimmageId, rsvps.userId],
        set: { status: rsvp.status },
      })
      .run();
  }

  async listByScrimmage(scrimmageId: string): Promise<Rsvp[]> {
    return this.db
      .select()
      .from(rsvps)
      .where(eq(rsvps.scrimmageId, scrimmageId))
      .all()
      .map((row) => ({
        scrimmageId: row.scrimmageId,
        guildId: row.guildId,
        userId: row.userId,
        status: row.status as RsvpStatus,
      }));
  }
}
