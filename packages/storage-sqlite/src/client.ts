import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type Db = BetterSQLite3Database<typeof schema>;

export interface SqliteConnection {
  readonly db: Db;
  readonly sqlite: Database.Database;
}

/** Open a SQLite database and wrap it with Drizzle, with sensible pragmas. */
export function createConnection(path: string): SqliteConnection {
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}
