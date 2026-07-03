import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { Db } from './client.js';
import { createConnection } from './client.js';

/** Absolute path to the bundled migrations folder (sibling of `src/` and `dist/`). */
export const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

/** Apply pending migrations on an existing Drizzle connection. */
export function applyMigrations(db: Db): void {
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

/** Open `path`, apply migrations, then close. Useful for one-off CLI usage. */
export function migrateSqlite(path: string): void {
  const { db, sqlite } = createConnection(path);
  try {
    applyMigrations(db);
  } finally {
    sqlite.close();
  }
}
