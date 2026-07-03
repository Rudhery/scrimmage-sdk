import { beforeEach, describe, expect, it } from 'vitest';
import { ScrimmageService } from './scrimmage-service.js';
import { TeamService } from './team-service.js';
import { ScrimmageStatus } from '../domain/scrimmage.js';
import { InvalidStateError, NotFoundError, ValidationError } from '../errors/index.js';
import { createMemoryStorage } from '../testing/memory-storage.js';
import type { Storage } from '../storage/repositories.js';

const GUILD = 'guild-1';
const NOW = new Date('2030-01-01T00:00:00.000Z');
const FUTURE = new Date('2030-02-01T18:00:00.000Z');

describe('ScrimmageService', () => {
  let storage: Storage;
  let scrims: ScrimmageService;
  let homeId: string;
  let awayId: string;

  beforeEach(async () => {
    storage = createMemoryStorage();
    let teamCounter = 0;
    const teams = new TeamService(storage.teams, {
      now: () => NOW,
      generateId: () => `team-${++teamCounter}`,
    });
    let scrimCounter = 0;
    scrims = new ScrimmageService(storage.scrimmages, storage.teams, {
      now: () => NOW,
      generateId: () => `scrim-${++scrimCounter}`,
    });

    const home = await teams.createTeam({
      guildId: GUILD,
      name: 'Home',
      tag: 'HOM',
      captainId: 'a',
    });
    const away = await teams.createTeam({
      guildId: GUILD,
      name: 'Away',
      tag: 'AWY',
      captainId: 'b',
    });
    homeId = home.id;
    awayId = away.id;
  });

  const propose = () =>
    scrims.propose({
      guildId: GUILD,
      homeTeamId: homeId,
      awayTeamId: awayId,
      scheduledAt: FUTURE,
      proposedBy: 'a',
    });

  it('proposes a scrimmage between two teams', async () => {
    const scrim = await propose();
    expect(scrim.status).toBe(ScrimmageStatus.Proposed);
    expect(scrim.result).toBeNull();
  });

  it('rejects a scrimmage of a team against itself', async () => {
    await expect(
      scrims.propose({
        guildId: GUILD,
        homeTeamId: homeId,
        awayTeamId: homeId,
        scheduledAt: FUTURE,
        proposedBy: 'a',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a scrimmage scheduled in the past', async () => {
    await expect(
      scrims.propose({
        guildId: GUILD,
        homeTeamId: homeId,
        awayTeamId: awayId,
        scheduledAt: new Date('2029-01-01T00:00:00.000Z'),
        proposedBy: 'a',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a scrimmage with an unknown team', async () => {
    await expect(
      scrims.propose({
        guildId: GUILD,
        homeTeamId: homeId,
        awayTeamId: 'ghost',
        scheduledAt: FUTURE,
        proposedBy: 'a',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('walks the full lifecycle: propose → confirm → result', async () => {
    const proposed = await propose();
    const confirmed = await scrims.confirm(GUILD, proposed.id);
    expect(confirmed.status).toBe(ScrimmageStatus.Confirmed);

    const played = await scrims.recordResult(GUILD, proposed.id, { homeScore: 3, awayScore: 1 });
    expect(played.status).toBe(ScrimmageStatus.Played);
    expect(played.result).toEqual({ homeScore: 3, awayScore: 1 });
  });

  it('does not allow recording a result before confirmation', async () => {
    const proposed = await propose();
    await expect(
      scrims.recordResult(GUILD, proposed.id, { homeScore: 1, awayScore: 0 }),
    ).rejects.toBeInstanceOf(InvalidStateError);
  });

  it('cannot cancel a played scrimmage', async () => {
    const proposed = await propose();
    await scrims.confirm(GUILD, proposed.id);
    await scrims.recordResult(GUILD, proposed.id, { homeScore: 0, awayScore: 0 });
    await expect(scrims.cancel(GUILD, proposed.id)).rejects.toBeInstanceOf(InvalidStateError);
  });

  it('reminds confirmed scrimmages within the window exactly once', async () => {
    const soon = new Date(NOW.getTime() + 10 * 60_000);
    const scrim = await scrims.propose({
      guildId: GUILD,
      homeTeamId: homeId,
      awayTeamId: awayId,
      scheduledAt: soon,
      proposedBy: 'a',
    });
    await scrims.confirm(GUILD, scrim.id);

    const reminded = await scrims.processDueReminders(15 * 60_000);
    expect(reminded.map((s) => s.id)).toEqual([scrim.id]);

    // A second pass finds nothing — the reminder was already marked sent.
    expect(await scrims.processDueReminders(15 * 60_000)).toHaveLength(0);
  });

  it('does not remind proposed (unconfirmed) scrimmages', async () => {
    const soon = new Date(NOW.getTime() + 10 * 60_000);
    await scrims.propose({
      guildId: GUILD,
      homeTeamId: homeId,
      awayTeamId: awayId,
      scheduledAt: soon,
      proposedBy: 'a',
    });

    expect(await scrims.processDueReminders(15 * 60_000)).toHaveLength(0);
  });
});
