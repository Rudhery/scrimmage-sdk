import { beforeEach, describe, expect, it } from 'vitest';
import { GuildSettingsService } from './guild-settings-service.js';
import { ScrimmageService } from './scrimmage-service.js';
import { StandingsService, buildStandings } from './standings-service.js';
import { TeamService } from './team-service.js';
import { createMemoryStorage } from '../testing/memory-storage.js';
import type { Storage } from '../storage/repositories.js';

const GUILD = 'g';
const NOW = new Date('2030-01-01T00:00:00.000Z');
const FUTURE = new Date('2030-02-01T00:00:00.000Z');

describe('standings', () => {
  let storage: Storage;
  let scrims: ScrimmageService;
  let standings: StandingsService;
  let alpha: string;
  let bravo: string;
  let charlie: string;

  beforeEach(async () => {
    storage = createMemoryStorage();
    let counter = 0;
    const runtime = { now: () => NOW, generateId: () => `id-${++counter}` };
    const teams = new TeamService(storage.teams, runtime);
    scrims = new ScrimmageService(storage.scrimmages, storage.teams, runtime);
    standings = new StandingsService(storage.scrimmages);

    alpha = (await teams.createTeam({ guildId: GUILD, name: 'Alpha', tag: 'ALP', captainId: 'a' }))
      .id;
    bravo = (await teams.createTeam({ guildId: GUILD, name: 'Bravo', tag: 'BRV', captainId: 'b' }))
      .id;
    charlie = (
      await teams.createTeam({ guildId: GUILD, name: 'Charlie', tag: 'CHR', captainId: 'c' })
    ).id;
  });

  async function play(home: string, away: string, homeScore: number, awayScore: number) {
    const scrim = await scrims.propose({
      guildId: GUILD,
      homeTeamId: home,
      awayTeamId: away,
      scheduledAt: FUTURE,
      proposedBy: 'x',
    });
    await scrims.confirm(GUILD, scrim.id);
    await scrims.recordResult(GUILD, scrim.id, { homeScore, awayScore });
  }

  it('ranks teams by points, then goal difference', async () => {
    await play(alpha, bravo, 3, 0); // Alpha win
    await play(alpha, charlie, 1, 1); // draw
    await play(bravo, charlie, 0, 2); // Charlie win

    const table = await standings.forGuild(GUILD);
    expect(table.map((s) => s.teamId)).toEqual([alpha, charlie, bravo]);

    const top = table.find((s) => s.teamId === alpha);
    expect(top?.points).toBe(4);
    expect(top?.goalDifference).toBe(3);
    expect(top?.played).toBe(2);
  });

  it('returns an all-zero standing for a team that has not played', async () => {
    const standing = await standings.forTeam(GUILD, alpha);
    expect(standing.played).toBe(0);
    expect(standing.points).toBe(0);
  });

  it('buildStandings ignores unplayed scrimmages', () => {
    expect(buildStandings([])).toEqual([]);
  });

  it('uses the guild-configured points', async () => {
    const settings = new GuildSettingsService(storage.guildSettings);
    await settings.setPoints(GUILD, 2, 1, 0); // 2 points per win instead of 3
    const configured = new StandingsService(storage.scrimmages, settings);

    await play(alpha, bravo, 3, 0); // Alpha win → 2 pts

    const table = await configured.forGuild(GUILD);
    expect(table.find((row) => row.teamId === alpha)?.points).toBe(2);
  });
});
