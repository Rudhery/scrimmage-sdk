import type { Storage } from '@scrimmage/core';
import { createConnection } from './client.js';
import { applyMigrations } from './migrator.js';
import { DrizzleGuildSettingsRepository } from './repositories/guild-settings-repository.js';
import { DrizzleBotPresenceRepository } from './repositories/bot-presence-repository.js';
import { DrizzleChampionshipRepository } from './repositories/championship-repository.js';
import { DrizzlePlayerStatsRepository } from './repositories/player-stats-repository.js';
import { DrizzlePollRepository } from './repositories/poll-repository.js';
import { DrizzleRsvpRepository } from './repositories/rsvp-repository.js';
import { DrizzleScrimmageRepository } from './repositories/scrimmage-repository.js';
import { DrizzleScrimmageAwardRepository } from './repositories/scrimmage-award-repository.js';
import { DrizzleStatCategoryRepository } from './repositories/stat-category-repository.js';
import { DrizzleTeamRepository } from './repositories/team-repository.js';

export interface SqliteStorageOptions {
  /** Path to the SQLite file. Use `':memory:'` for an ephemeral database. */
  path: string;
  /** Apply pending migrations when connecting. Defaults to `false`. */
  migrate?: boolean;
}

/**
 * Create a {@link Storage} backed by SQLite. This is the entry point most callers
 * use — it wires up the Drizzle repositories and owns the connection lifecycle.
 */
export function createSqliteStorage(options: SqliteStorageOptions): Storage {
  const { db, sqlite } = createConnection(options.path);
  if (options.migrate) {
    applyMigrations(db);
  }

  return {
    teams: new DrizzleTeamRepository(db),
    scrimmages: new DrizzleScrimmageRepository(db),
    guildSettings: new DrizzleGuildSettingsRepository(db),
    statCategories: new DrizzleStatCategoryRepository(db),
    playerStats: new DrizzlePlayerStatsRepository(db),
    rsvps: new DrizzleRsvpRepository(db),
    polls: new DrizzlePollRepository(db),
    championships: new DrizzleChampionshipRepository(db),
    botPresence: new DrizzleBotPresenceRepository(db),
    scrimmageAwards: new DrizzleScrimmageAwardRepository(db),
    close() {
      sqlite.close();
    },
  };
}
