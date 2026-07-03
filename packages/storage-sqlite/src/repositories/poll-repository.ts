import { and, eq } from 'drizzle-orm';
import type { AvailabilityPoll, PollRepository, PollVote } from '@scrimmage/core';
import type { Db } from '../client.js';
import { pollVotes, polls } from '../schema.js';

export class DrizzlePollRepository implements PollRepository {
  constructor(private readonly db: Db) {}

  async create(poll: AvailabilityPoll): Promise<AvailabilityPoll> {
    this.db
      .insert(polls)
      .values({
        id: poll.id,
        guildId: poll.guildId,
        title: poll.title,
        slots: JSON.stringify(poll.slots),
        createdBy: poll.createdBy,
        createdAt: poll.createdAt,
      })
      .run();
    return poll;
  }

  async findById(id: string): Promise<AvailabilityPoll | null> {
    const row = this.db.select().from(polls).where(eq(polls.id, id)).get();
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      guildId: row.guildId,
      title: row.title,
      slots: JSON.parse(row.slots) as string[],
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  async addVote(vote: PollVote): Promise<void> {
    this.db.insert(pollVotes).values(vote).onConflictDoNothing().run();
  }

  async removeVote(vote: PollVote): Promise<void> {
    this.db
      .delete(pollVotes)
      .where(
        and(
          eq(pollVotes.pollId, vote.pollId),
          eq(pollVotes.slotIndex, vote.slotIndex),
          eq(pollVotes.userId, vote.userId),
        ),
      )
      .run();
  }

  async listVotes(pollId: string): Promise<PollVote[]> {
    return this.db
      .select()
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId))
      .all()
      .map((row) => ({ pollId: row.pollId, slotIndex: row.slotIndex, userId: row.userId }));
  }
}
