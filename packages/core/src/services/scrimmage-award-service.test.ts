import { describe, expect, it } from 'vitest';
import { ScrimmageAwardService } from './scrimmage-award-service.js';
import { AwardCategory } from '../domain/scrimmage-award.js';
import { createMemoryStorage } from '../testing/memory-storage.js';

describe('ScrimmageAwardService', () => {
  it('sets, overrides and clears the per-match MVP titles', async () => {
    const service = new ScrimmageAwardService(createMemoryStorage().scrimmageAwards);

    await service.setAward('s1', AwardCategory.Overall, 'u1');
    await service.setAward('s1', AwardCategory.Offensive, 'u2');
    await service.setAward('s1', AwardCategory.Overall, 'u3'); // one holder per title

    let awards = await service.forScrimmage('s1');
    expect(awards).toHaveLength(2);
    expect(awards.find((a) => a.category === AwardCategory.Overall)?.userId).toBe('u3');

    await service.setAward('s1', AwardCategory.Overall, null); // clear
    awards = await service.forScrimmage('s1');
    expect(awards.find((a) => a.category === AwardCategory.Overall)).toBeUndefined();
    expect(awards).toHaveLength(1);
  });
});
