import type { AwardCategory, ScrimmageAward } from '../domain/scrimmage-award.js';
import type { ScrimmageAwardRepository } from '../storage/repositories.js';

/** Manages the per-match MVP titles (offensive / defensive / overall). */
export class ScrimmageAwardService {
  constructor(private readonly awards: ScrimmageAwardRepository) {}

  /** Award (or clear, with `null`) a title for a scrimmage. */
  async setAward(
    scrimmageId: string,
    category: AwardCategory,
    userId: string | null,
  ): Promise<void> {
    if (!userId || userId.trim() === '') {
      await this.awards.remove(scrimmageId, category);
      return;
    }
    await this.awards.set({ scrimmageId, category, userId: userId.trim() });
  }

  forScrimmage(scrimmageId: string): Promise<ScrimmageAward[]> {
    return this.awards.listByScrimmage(scrimmageId);
  }
}
