export type Team = 'red' | 'blue';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TankState {
  id: string;
  team: Team;
  displayName: string;
  x: number;
  y: number;
  rotation: number; // radians
  health: number;
  alive: boolean;
  hasFlag: boolean;
  lastShotTime: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  rotation: number;
  speed: number;
  vx: number; // x velocity component (pixels/second), updated on wall bounce
  vy: number; // y velocity component (pixels/second), updated on wall bounce
  createdAt: number;
}

export interface FlagState {
  team: Team;
  x: number;
  y: number;
  carrierId: string | null; // player id carrying this flag, or null if on ground
  atBase: boolean;
}

export interface GameState {
  tick: number;
  tanks: Record<string, TankState>;
  projectiles: ProjectileState[];
  flags: Record<Team, FlagState>;
  scores: Record<Team, number>;
}

export interface PlayerInput {
  tick: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
}

// Room system
export interface RoomInfo {
  code: string;
  playerCount: number;
}

// Lobby system — represents a player in the pre-game lobby
export interface LobbyPlayer {
  id: string;
  displayName: string;
  team: Team | null; // null means unassigned
}

// Full lobby state broadcast to all players whenever something changes
export interface LobbyState {
  roomCode: string;
  hostId: string;
  players: LobbyPlayer[];
}

// Socket.IO typed events
export interface ClientToServerEvents {
  createRoom: (data: { displayName: string }) => void;
  joinRoom: (data: { code: string; displayName: string }) => void;
  /** Host assigns a player to a team (or null to unassign) */
  assignTeam: (data: { targetPlayerId: string; team: Team | null }) => void;
  /** Host starts the game from the lobby */
  startGame: () => void;
  playerInput: (input: PlayerInput) => void;
}

export interface ServerToClientEvents {
  roomCreated: (data: { code: string }) => void;
  roomJoined: (data: { code: string }) => void;
  roomError: (data: { message: string }) => void;
  /** Broadcast whenever lobby state changes (player joins/leaves, team assignment, etc.) */
  lobbyUpdate: (state: LobbyState) => void;
  /** Signals all clients to transition from lobby into the game */
  gameStarted: () => void;
  gameState: (state: GameState) => void;
  playerAssignment: (data: { playerId: string; team: Team }) => void;
  flagCaptured: (data: { team: Team; playerId: string }) => void;
  playerKilled: (data: { killerId: string; victimId: string }) => void;
  /** Broadcast when a team reaches the score limit; game loop stops after this */
  gameOver: (data: { winner: Team }) => void;
}
