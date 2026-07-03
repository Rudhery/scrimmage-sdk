/** An availability poll: candidate time slots members can mark themselves free for. */
export interface AvailabilityPoll {
  readonly id: string;
  readonly guildId: string;
  readonly title: string;
  /** Candidate slots (free-text labels, e.g. "Sat 8pm"). */
  readonly slots: string[];
  readonly createdBy: string;
  readonly createdAt: Date;
}

/** A user marking themselves available for one slot of a poll. */
export interface PollVote {
  readonly pollId: string;
  readonly slotIndex: number;
  readonly userId: string;
}
