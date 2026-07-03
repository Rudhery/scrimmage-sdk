import { beforeEach, describe, expect, it } from 'vitest';
import { PlayerStatsService } from './player-stats-service.js';
import { StatCategoryService } from './stat-category-service.js';
import { ValidationError } from '../errors/index.js';
import { createMemoryStorage } from '../testing/memory-storage.js';
import type { Storage } from '../storage/repositories.js';

const G = 'g';

describe('player stats', () => {
  let storage: Storage;
  let categories: StatCategoryService;
  let stats: PlayerStatsService;

  beforeEach(() => {
    storage = createMemoryStorage();
    categories = new StatCategoryService(storage.statCategories);
    stats = new PlayerStatsService(storage.playerStats, categories);
  });

  it('defaults to the volleyball preset', async () => {
    const cats = await categories.list(G);
    expect(cats).toHaveLength(6);
    expect(cats.map((category) => category.key)).toContain('spike');
  });

  it('records stats and computes a weighted MVP', async () => {
    // Preset weights: points 1, spike 0.8, ace 1.2.
    await stats.record({
      guildId: G,
      scrimmageId: 's1',
      teamId: 't1',
      userId: 'hinata',
      values: { points: 10, spike: 8 }, // 10 + 6.4 = 16.4
    });
    await stats.record({
      guildId: G,
      scrimmageId: 's1',
      teamId: 't1',
      userId: 'kageyama',
      values: { points: 6, ace: 5 }, // 6 + 6 = 12
    });

    const board = await stats.leaderboard(G);
    expect(board.map((entry) => entry.userId)).toEqual(['hinata', 'kageyama']);
    expect((await stats.mvp(G))?.userId).toBe('hinata');
  });

  it('aggregates across scrimmages and counts appearances', async () => {
    await stats.record({
      guildId: G,
      scrimmageId: 's1',
      teamId: 't1',
      userId: 'hinata',
      values: { points: 5 },
    });
    await stats.record({
      guildId: G,
      scrimmageId: 's2',
      teamId: 't1',
      userId: 'hinata',
      values: { points: 7 },
    });

    const player = await stats.forPlayer(G, 'hinata');
    expect(player?.appearances).toBe(2);
    expect(player?.totals.points).toBe(12);
  });

  it('rejects unknown stat categories', async () => {
    await expect(
      stats.record({
        guildId: G,
        scrimmageId: 's1',
        teamId: 't1',
        userId: 'x',
        values: { flying: 1 },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('reflects reconfigured weights in the MVP score', async () => {
    await categories.setWeight(G, 'spike', 5);
    await stats.record({
      guildId: G,
      scrimmageId: 's1',
      teamId: 't1',
      userId: 'a',
      values: { points: 1, spike: 2 }, // 1 + 10 = 11
    });
    expect((await stats.mvp(G))?.score).toBe(11);
  });
});
