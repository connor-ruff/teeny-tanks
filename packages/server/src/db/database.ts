import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { migrations } from './migrations.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): Database.Database {
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.DB_PATH || path.join(dbDir, 'teeny-tanks.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create schema_version table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Seed with version 0 if empty
  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
  if (!row) {
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  }

  runMigrations();

  console.log(`Database initialized at ${dbPath} (version ${getCurrentVersion()})`);
  return db;
}

function getCurrentVersion(): number {
  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number };
  return row.version;
}

function runMigrations(): void {
  const currentVersion = getCurrentVersion();
  const pending = migrations.filter(m => m.version > currentVersion);

  if (pending.length === 0) return;

  console.log(`Running ${pending.length} pending migration(s)...`);

  const runAll = db.transaction(() => {
    for (const migration of pending) {
      console.log(`  Migration ${migration.version}: ${migration.description}`);
      migration.up(db);
      db.prepare('UPDATE schema_version SET version = ?').run(migration.version);
    }
  });

  runAll();
}
