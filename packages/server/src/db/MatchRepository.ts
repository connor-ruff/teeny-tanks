import { getDb } from './database.js';

export interface CreateMatchParams {
  roomCode: string;
  winnerTeam: string;
  scoreRed: number;
  scoreBlue: number;
  scoreLimit: number;
  startedAt: string;
  durationSecs: number;
}

export interface MatchPlayerParams {
  matchId: number;
  userId: number;
  team: string;
  kills: number;
  deaths: number;
  flagsCaptured: number;
  flagsReturned: number;
}

export interface MatchKillParams {
  matchId: number;
  killerUserId: number;
  victimUserId: number;
}

export interface MatchFlagEventParams {
  matchId: number;
  userId: number;
  eventType: 'capture' | 'return';
}

export function createMatch(params: CreateMatchParams): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO matches (room_code, winner_team, score_red, score_blue, score_limit, started_at, duration_secs)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.roomCode, params.winnerTeam, params.scoreRed, params.scoreBlue,
    params.scoreLimit, params.startedAt, params.durationSecs
  );
  return result.lastInsertRowid as number;
}

export function addMatchPlayer(params: MatchPlayerParams): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO match_players (match_id, user_id, team, kills, deaths, flags_captured, flags_returned)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.matchId, params.userId, params.team,
    params.kills, params.deaths, params.flagsCaptured, params.flagsReturned
  );
}

export function addMatchKill(params: MatchKillParams): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO match_kills (match_id, killer_user_id, victim_user_id)
    VALUES (?, ?, ?)
  `).run(params.matchId, params.killerUserId, params.victimUserId);
}

export function addMatchFlagEvent(params: MatchFlagEventParams): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO match_flag_events (match_id, user_id, event_type)
    VALUES (?, ?, ?)
  `).run(params.matchId, params.userId, params.eventType);
}
