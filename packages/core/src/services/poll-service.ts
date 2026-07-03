import { z } from 'zod';
import type { AvailabilityPoll, PollVote } from '../domain/poll.js';
import type { PollRepository } from '../storage/repositories.js';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { resolveRuntime, type ServiceRuntime } from '../runtime.js';
import { parse } from '../validation.js';

const titleSchema = z.string().trim().min(1).max(100);
const slotSchema = z.string().trim().min(1).max(60);
const MAX_SLOTS = 10;

/** Availability polls: candidate slots members mark themselves free for. */
export class PollService {
  private readonly runtime: ServiceRuntime;

  constructor(
    private readonly polls: PollRepository,
    runtime?: Partial<ServiceRuntime>,
  ) {
    this.runtime = resolveRuntime(runtime);
  }

  async createPoll(
    guildId: string,
    title: string,
    slots: string[],
    createdBy: string,
  ): Promise<AvailabilityPoll> {
    const cleanSlots = slots
      .map((slot) => slot.trim())
      .filter((slot) => slot.length > 0)
      .slice(0, MAX_SLOTS)
      .map((slot) => parse(slotSchema, slot));
    if (cleanSlots.length < 2) {
      throw new ValidationError('Provide at least two options, separated by commas.');
    }
    const poll: AvailabilityPoll = {
      id: this.runtime.generateId(),
      guildId,
      title: parse(titleSchema, title),
      slots: cleanSlots,
      createdBy,
      createdAt: this.runtime.now(),
    };
    return this.polls.create(poll);
  }

  async getPoll(id: string): Promise<AvailabilityPoll> {
    const poll = await this.polls.findById(id);
    if (!poll) {
      throw new NotFoundError('Poll not found.');
    }
    return poll;
  }

  /** Toggle a user's availability for a slot; returns the new votes. */
  async toggle(pollId: string, slotIndex: number, userId: string): Promise<PollVote[]> {
    const votes = await this.polls.listVotes(pollId);
    const exists = votes.some((v) => v.slotIndex === slotIndex && v.userId === userId);
    if (exists) {
      await this.polls.removeVote({ pollId, slotIndex, userId });
    } else {
      await this.polls.addVote({ pollId, slotIndex, userId });
    }
    return this.polls.listVotes(pollId);
  }

  listVotes(pollId: string): Promise<PollVote[]> {
    return this.polls.listVotes(pollId);
  }
}
