import { getDb } from './database.js';

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  preferred_team: string | null;
  created_at: string;
  kills: number;
  deaths: number;
  flags_captured: number;
  flags_returned: number;
  games_played: number;
  wins: number;
  losses: number;
}

export function createUser(username: string, passwordHash: string, displayName: string): UserRow {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(username, passwordHash, displayName);
  return findById(result.lastInsertRowid as number)!;
}

export function findByUsername(username: string): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
}

export function findById(id: number): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}
