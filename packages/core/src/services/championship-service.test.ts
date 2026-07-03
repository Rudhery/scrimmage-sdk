import { describe, expect, it } from 'vitest';
import { ChampionshipService } from './championship-service.js';
import { ChampionshipStatus, MatchStatus } from '../domain/championship.js';
import { createMemoryStorage } from '../testing/memory-storage.js';

function service(): ChampionshipService {
  return new ChampionshipService(createMemoryStorage().championships);
}

const window = { startsAt: new Date('2026-07-01'), endsAt: new Date('2026-07-31') };
const straightSets = [
  { homeScore: 25, awayScore: 20 },
  { homeScore: 25, awayScore: 18 },
];

describe('ChampionshipService', () => {
  it('creates a draft championship', async () => {
    const svc = service();
    const champ = await svc.createChampionship('g', { name: 'Cup', bestOf: 5, ...window });
    expect(champ.status).toBe(ChampionshipStatus.Draft);
    expect(champ.bestOf).toBe(5);
  });

  it('rejects an invalid best-of and inverted dates', async () => {
    const svc = service();
    await expect(
      svc.createChampionship('g', { name: 'x', bestOf: 4, ...window }),
    ).rejects.toThrow();
    await expect(
      svc.createChampionship('g', {
        name: 'x',
        bestOf: 3,
        startsAt: new Date('2026-07-31'),
        endsAt: new Date('2026-07-01'),
      }),
    ).rejects.toThrow();
  });

  it('seeds teams, draws a bracket and advances winners into the final', async () => {
    const svc = service();
    const champ = await svc.createChampionship('g', { name: 'Cup', bestOf: 3, ...window });
    await svc.setTeams('g', champ.id, ['t1', 't2', 't3', 't4']);

    const active = await svc.generateBracket('g', champ.id);
    expect(active.status).toBe(ChampionshipStatus.Active);

    const round1 = (await svc.listMatches(champ.id))
      .filter((m) => m.round === 1)
      .sort((a, b) => a.position - b.position);
    expect(round1).toHaveLength(2);

    await svc.recordSets('g', round1[0]!.id, straightSets);
    await svc.recordSets('g', round1[1]!.id, straightSets);

    const final = (await svc.listMatches(champ.id)).find((m) => m.round === 2);
    expect(final?.homeTeamId).toBe(round1[0]!.homeTeamId);
    expect(final?.awayTeamId).toBe(round1[1]!.homeTeamId);
    expect(final?.status).toBe(MatchStatus.Pending);

    await svc.recordSets('g', final!.id, straightSets);
    expect((await svc.getChampionship('g', champ.id)).status).toBe(ChampionshipStatus.Completed);
    const decided = await svc.getMatch(final!.id);
    expect(decided.match.winnerTeamId).toBe(final!.homeTeamId);
    expect(decided.sets).toHaveLength(2);
  });

  it('sends a bye straight into the next round', async () => {
    const svc = service();
    const champ = await svc.createChampionship('g', { name: 'Cup', bestOf: 3, ...window });
    await svc.setTeams('g', champ.id, ['t1', 't2', 't3']);
    await svc.generateBracket('g', champ.id);

    const matches = await svc.listMatches(champ.id);
    const final = matches.find((m) => m.round === 2);
    expect(final?.homeTeamId).toBe('t1'); // top seed advanced on a bye

    const semi = matches.find((m) => m.round === 1 && m.winnerTeamId === null);
    await svc.recordSets('g', semi!.id, straightSets);
    expect((await svc.getMatch(final!.id)).match.awayTeamId).toBe(semi!.homeTeamId);
  });

  it('rejects a result with the wrong number of sets', async () => {
    const svc = service();
    const champ = await svc.createChampionship('g', { name: 'Cup', bestOf: 3, ...window });
    await svc.setTeams('g', champ.id, ['t1', 't2']);
    await svc.generateBracket('g', champ.id);
    const final = (await svc.listMatches(champ.id))[0]!;
    await expect(
      svc.recordSets('g', final.id, [{ homeScore: 25, awayScore: 20 }]),
    ).rejects.toThrow();
  });
});
