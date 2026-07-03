import { afterEach, describe, expect, it } from 'vitest';
import { ScrimmageService, ScrimmageStatus, TeamService, type Storage } from '@scrimmage/core';
import { createSqliteStorage } from './index.js';

describe('SQLite storage adapter', () => {
  let storage: Storage;

  afterEach(async () => {
    await storage?.close();
  });

  function setup() {
    storage = createSqliteStorage({ path: ':memory:', migrate: true });
    return {
      teams: new TeamService(storage.teams),
      scrims: new ScrimmageService(storage.scrimmages, storage.teams),
    };
  }

  it('persists teams and their rosters', async () => {
    const { teams } = setup();
    const team = await teams.createTeam({
      guildId: 'g',
      name: 'Alpha',
      tag: 'ALP',
      captainId: 'cap',
    });

    const fetched = await teams.getTeam('g', team.id);
    expect(fetched.name).toBe('Alpha');
    expect(fetched.tag).toBe('ALP');

    const roster = await teams.getRoster(team.id);
    expect(roster.map((m) => m.userId)).toContain('cap');
  });

  it("finds a user's team across the guild (one team per person)", async () => {
    const { teams } = setup();
    const alpha = await teams.createTeam({
      guildId: 'g',
      name: 'Alpha',
      tag: 'ALP',
      captainId: 'cap',
    });
    await teams.addMember('g', alpha.id, 'member-1');

    expect(await storage.teams.findUserTeam('g', 'member-1')).toMatchObject({ id: alpha.id });
    expect(await storage.teams.findUserTeam('g', 'nobody')).toBeNull();
    // Different guild → not found.
    expect(await storage.teams.findUserTeam('other', 'member-1')).toBeNull();
  });

  it('cascades roster deletion when a team is removed', async () => {
    const { teams } = setup();
    const team = await teams.createTeam({
      guildId: 'g',
      name: 'Beta',
      tag: 'BET',
      captainId: 'cap',
    });

    await teams.deleteTeam('g', team.id);
    expect(await teams.getRoster(team.id)).toHaveLength(0);
  });

  it('runs a scrimmage through its full lifecycle', async () => {
    const { teams, scrims } = setup();
    const home = await teams.createTeam({ guildId: 'g', name: 'Home', tag: 'HOM', captainId: 'a' });
    const away = await teams.createTeam({ guildId: 'g', name: 'Away', tag: 'AWY', captainId: 'b' });

    const scrim = await scrims.propose({
      guildId: 'g',
      homeTeamId: home.id,
      awayTeamId: away.id,
      scheduledAt: new Date(Date.now() + 86_400_000),
      proposedBy: 'a',
    });

    await scrims.confirm('g', scrim.id);
    const played = await scrims.recordResult('g', scrim.id, { homeScore: 2, awayScore: 2 });
    expect(played.status).toBe(ScrimmageStatus.Played);

    const listed = await scrims.list('g', { status: ScrimmageStatus.Played });
    expect(listed).toHaveLength(1);
  });
});
