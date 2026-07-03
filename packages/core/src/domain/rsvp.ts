/** A player's attendance response for a scrimmage. */
export const RsvpStatus = {
  Going: 'going',
  Maybe: 'maybe',
  Declined: 'declined',
} as const;

export type RsvpStatus = (typeof RsvpStatus)[keyof typeof RsvpStatus];

/** One user's RSVP for a scrimmage. */
export interface Rsvp {
  readonly scrimmageId: string;
  readonly guildId: string;
  readonly userId: string;
  readonly status: RsvpStatus;
}
