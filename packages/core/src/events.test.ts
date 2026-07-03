import { describe, expect, it, vi } from 'vitest';
import { TypedEventBus } from './events.js';
import { TeamService } from './services/team-service.js';
import { createMemoryStorage } from './testing/memory-storage.js';

describe('TypedEventBus', () => {
  it('delivers events to subscribers and stops after unsubscribe', () => {
    const bus = new TypedEventBus();
    const seen: string[] = [];
    const off = bus.on('team.renamed', ({ previousName }) => {
      seen.push(previousName);
    });

    bus.emit('team.renamed', { team: {} as never, previousName: 'A' });
    off();
    bus.emit('team.renamed', { team: {} as never, previousName: 'B' });

    expect(seen).toEqual(['A']);
  });

  it('isolates a throwing listener and reports it via onError', () => {
    const onError = vi.fn();
    const bus = new TypedEventBus({ onError });
    const survivor = vi.fn();

    bus.on('team.deleted', () => {
      throw new Error('boom');
    });
    bus.on('team.deleted', survivor);
    bus.emit('team.deleted', { team: {} as never });

    expect(onError).toHaveBeenCalledOnce();
    expect(survivor).toHaveBeenCalledOnce();
  });
});

describe('services publish domain events', () => {
  it('emits team.created when a team is created', async () => {
    const bus = new TypedEventBus();
    const created = vi.fn();
    bus.on('team.created', created);

    const storage = createMemoryStorage();
    const teams = new TeamService(storage.teams, { events: bus });
    await teams.createTeam({ guildId: 'g', name: 'Alpha', tag: 'ALP', captainId: 'c' });

    expect(created).toHaveBeenCalledOnce();
  });
});
