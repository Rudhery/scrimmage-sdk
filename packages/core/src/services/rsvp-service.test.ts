import { describe, expect, it } from 'vitest';
import { RsvpService } from './rsvp-service.js';
import { RsvpStatus } from '../domain/rsvp.js';
import { createMemoryStorage } from '../testing/memory-storage.js';

describe('RsvpService', () => {
  it('records one RSVP per user and updates on change', async () => {
    const service = new RsvpService(createMemoryStorage().rsvps);

    await service.setStatus('s1', 'g', 'u1', RsvpStatus.Going);
    await service.setStatus('s1', 'g', 'u2', RsvpStatus.Maybe);
    await service.setStatus('s1', 'g', 'u1', RsvpStatus.Declined); // u1 changes their mind

    const list = await service.forScrimmage('s1');
    expect(list).toHaveLength(2);
    expect(list.find((rsvp) => rsvp.userId === 'u1')?.status).toBe(RsvpStatus.Declined);
  });
});
