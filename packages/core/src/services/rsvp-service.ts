import type { Rsvp, RsvpStatus } from '../domain/rsvp.js';
import type { RsvpRepository } from '../storage/repositories.js';

/** Records and reads attendance (RSVP) for scrimmages. */
export class RsvpService {
  constructor(private readonly rsvps: RsvpRepository) {}

  /** Set a user's attendance for a scrimmage. */
  async setStatus(
    scrimmageId: string,
    guildId: string,
    userId: string,
    status: RsvpStatus,
  ): Promise<Rsvp> {
    const rsvp: Rsvp = { scrimmageId, guildId, userId, status };
    await this.rsvps.set(rsvp);
    return rsvp;
  }

  /** All RSVPs for a scrimmage. */
  forScrimmage(scrimmageId: string): Promise<Rsvp[]> {
    return this.rsvps.listByScrimmage(scrimmageId);
  }
}
