import { describe, expect, it } from 'vitest';
import { PollService } from './poll-service.js';
import { createMemoryStorage } from '../testing/memory-storage.js';

describe('PollService', () => {
  it('creates a poll and toggles availability per user/slot', async () => {
    const service = new PollService(createMemoryStorage().polls);
    const poll = await service.createPoll('g', 'When can we play?', ['Sat', 'Sun', 'Mon'], 'u0');
    expect(poll.slots).toEqual(['Sat', 'Sun', 'Mon']);

    await service.toggle(poll.id, 0, 'u1');
    await service.toggle(poll.id, 0, 'u2');
    const votes = await service.toggle(poll.id, 1, 'u1');
    expect(votes.filter((vote) => vote.slotIndex === 0)).toHaveLength(2);

    const after = await service.toggle(poll.id, 0, 'u1'); // u1 changes their mind
    expect(after.filter((vote) => vote.slotIndex === 0)).toHaveLength(1);
  });

  it('rejects polls with fewer than two options', async () => {
    const service = new PollService(createMemoryStorage().polls);
    await expect(service.createPoll('g', 'x', ['only one'], 'u0')).rejects.toThrow();
  });
});
