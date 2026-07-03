import { z } from 'zod';
import { VOLLEYBALL_PRESET, type StatCategory } from '../domain/stats.js';
import type { StatCategoryRepository } from '../storage/repositories.js';
import { ConflictError, NotFoundError } from '../errors/index.js';
import { parse } from '../validation.js';

const keySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9_]+$/, 'Key may only contain lowercase letters, numbers and underscores.');
const labelSchema = z.string().trim().min(1).max(30);
const weightSchema = z.number().finite().min(0).max(100);

function preset(guildId: string): StatCategory[] {
  return VOLLEYBALL_PRESET.map((category) => ({ ...category, guildId }));
}

/**
 * Per-guild stat category configuration. A guild starts on the volleyball preset;
 * the first edit "materialises" the preset into storage so it can be customised.
 */
export class StatCategoryService {
  constructor(private readonly categories: StatCategoryRepository) {}

  async list(guildId: string): Promise<StatCategory[]> {
    const stored = await this.categories.list(guildId);
    const list = stored.length > 0 ? stored : preset(guildId);
    return [...list].sort((a, b) => a.position - b.position);
  }

  private async materialise(guildId: string): Promise<StatCategory[]> {
    const stored = await this.categories.list(guildId);
    if (stored.length > 0) {
      return stored;
    }
    const seeded = preset(guildId);
    for (const category of seeded) {
      await this.categories.upsert(category);
    }
    return seeded;
  }

  async add(guildId: string, key: string, label: string, weight: number): Promise<StatCategory> {
    const current = await this.materialise(guildId);
    const slug = parse(keySchema, key);
    if (current.some((category) => category.key === slug)) {
      throw new ConflictError(`A stat category "${slug}" already exists.`);
    }
    const category: StatCategory = {
      guildId,
      key: slug,
      label: parse(labelSchema, label),
      weight: parse(weightSchema, weight),
      position: current.length,
    };
    await this.categories.upsert(category);
    return category;
  }

  async setWeight(guildId: string, key: string, weight: number): Promise<StatCategory> {
    const current = await this.materialise(guildId);
    const category = current.find((entry) => entry.key === key);
    if (!category) {
      throw new NotFoundError(`No stat category "${key}".`);
    }
    const updated: StatCategory = { ...category, weight: parse(weightSchema, weight) };
    await this.categories.upsert(updated);
    return updated;
  }

  async remove(guildId: string, key: string): Promise<void> {
    await this.materialise(guildId);
    await this.categories.remove(guildId, key);
  }
}
