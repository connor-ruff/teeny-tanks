import Database from 'better-sqlite3';

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema: users, matches, match_players, match_kills, match_flag_events',
    up(db) {
      db.exec(`
        CREATE TABLE users (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          username        TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash   TEXT NOT NULL,
          display_name    TEXT NOT NULL,
          preferred_team  TEXT DEFAULT NULL,
          created_at      TEXT NOT NULL DEFAULT (datetime('now')),
          kills           INTEGER NOT NULL DEFAULT 0,
          deaths          INTEGER NOT NULL DEFAULT 0,
          flags_captured  INTEGER NOT NULL DEFAULT 0,
          flags_returned  INTEGER NOT NULL DEFAULT 0,
          games_played    INTEGER NOT NULL DEFAULT 0,
          wins            INTEGER NOT NULL DEFAULT 0,
          losses          INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE matches (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          room_code       TEXT NOT NULL,
          winner_team     TEXT NOT NULL,
          score_red       INTEGER NOT NULL,
          score_blue      INTEGER NOT NULL,
          score_limit     INTEGER NOT NULL,
          started_at      TEXT NOT NULL,
          ended_at        TEXT NOT NULL DEFAULT (datetime('now')),
          duration_secs   INTEGER NOT NULL
        );

        CREATE TABLE match_players (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id        INTEGER NOT NULL REFERENCES matches(id),
          user_id         INTEGER NOT NULL REFERENCES users(id),
          team            TEXT NOT NULL,
          kills           INTEGER NOT NULL DEFAULT 0,
          deaths          INTEGER NOT NULL DEFAULT 0,
          flags_captured  INTEGER NOT NULL DEFAULT 0,
          flags_returned  INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE match_kills (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id        INTEGER NOT NULL REFERENCES matches(id),
          killer_user_id  INTEGER NOT NULL REFERENCES users(id),
          victim_user_id  INTEGER NOT NULL REFERENCES users(id),
          occurred_at     TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE match_flag_events (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id        INTEGER NOT NULL REFERENCES matches(id),
          user_id         INTEGER NOT NULL REFERENCES users(id),
          event_type      TEXT NOT NULL,
          occurred_at     TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX idx_users_kills ON users(kills DESC);
        CREATE INDEX idx_users_wins ON users(wins DESC);
        CREATE INDEX idx_users_flags_captured ON users(flags_captured DESC);
        CREATE INDEX idx_match_players_user ON match_players(user_id);
        CREATE INDEX idx_match_players_match ON match_players(match_id);
        CREATE INDEX idx_match_kills_match ON match_kills(match_id);
        CREATE INDEX idx_match_flag_events_match ON match_flag_events(match_id);
      `);
    },
  },
];
