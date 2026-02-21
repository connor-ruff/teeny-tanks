import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInput,
  GameState,
  Team,
  LobbyState,
} from '@teeny-tanks/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Manages the Socket.IO connection and room lifecycle.
 * The socket connects on construction, but the player does not enter a game room
 * until they explicitly create or join one.
 */
export class SocketManager {
  private socket: TypedSocket;
  public playerId: string | null = null;
  public team: Team | null = null;
  public roomCode: string | null = null;
  public latestState: GameState | null = null;

  private onStateCallbacks: Array<(state: GameState) => void> = [];
  private onAssignCallbacks: Array<(data: { playerId: string; team: Team }) => void> = [];
  private onKillCallbacks: Array<(data: { killerId: string; victimId: string }) => void> = [];
  private onFlagCaptureCallbacks: Array<(data: { team: Team; playerId: string }) => void> = [];
  private onRoomCreatedCallbacks: Array<(data: { code: string }) => void> = [];
  private onRoomJoinedCallbacks: Array<(data: { code: string }) => void> = [];
  private onRoomErrorCallbacks: Array<(data: { message: string }) => void> = [];
  private onLobbyUpdateCallbacks: Array<(state: LobbyState) => void> = [];
  private onGameStartedCallbacks: Array<() => void> = [];

  constructor() {
    this.socket = io('http://localhost:3001');

    // Room events
    this.socket.on('roomCreated', (data) => {
      this.roomCode = data.code;
      this.playerId = this.socket.id ?? null;
      console.log(`Room created: ${data.code}`);
      for (const cb of this.onRoomCreatedCallbacks) cb(data);
    });

    this.socket.on('roomJoined', (data) => {
      this.roomCode = data.code;
      this.playerId = this.socket.id ?? null;
      console.log(`Joined room: ${data.code}`);
      for (const cb of this.onRoomJoinedCallbacks) cb(data);
    });

    this.socket.on('roomError', (data) => {
      console.warn(`Room error: ${data.message}`);
      for (const cb of this.onRoomErrorCallbacks) cb(data);
    });

    // Lobby events
    this.socket.on('lobbyUpdate', (state) => {
      for (const cb of this.onLobbyUpdateCallbacks) cb(state);
    });

    this.socket.on('gameStarted', () => {
      for (const cb of this.onGameStartedCallbacks) cb();
    });

    // Game events
    this.socket.on('playerAssignment', (data) => {
      this.playerId = data.playerId;
      this.team = data.team;
      console.log(`Assigned as ${data.team} (${data.playerId})`);
      for (const cb of this.onAssignCallbacks) cb(data);
    });

    this.socket.on('gameState', (state) => {
      this.latestState = state;
      for (const cb of this.onStateCallbacks) cb(state);
    });

    this.socket.on('flagCaptured', (data) => {
      console.log(`Flag captured by team ${data.team}!`);
      for (const cb of this.onFlagCaptureCallbacks) cb(data);
    });

    this.socket.on('playerKilled', (data) => {
      console.log(`Player ${data.victimId} killed by ${data.killerId}`);
      for (const cb of this.onKillCallbacks) cb(data);
    });
  }

  // ── Room actions ──

  createRoom(displayName: string): void {
    this.socket.emit('createRoom', { displayName });
  }

  joinRoom(code: string, displayName: string): void {
    this.socket.emit('joinRoom', { code, displayName });
  }

  // ── Lobby actions ──

  /** Host assigns a player to a team */
  assignTeam(targetPlayerId: string, team: Team | null): void {
    this.socket.emit('assignTeam', { targetPlayerId, team });
  }

  /** Host starts the game */
  startGame(): void {
    this.socket.emit('startGame');
  }

  // ── Game actions ──

  sendInput(input: PlayerInput): void {
    this.socket.emit('playerInput', input);
  }

  // ── Event subscriptions ──

  onRoomCreated(cb: (data: { code: string }) => void): void {
    this.onRoomCreatedCallbacks.push(cb);
  }

  onRoomJoined(cb: (data: { code: string }) => void): void {
    this.onRoomJoinedCallbacks.push(cb);
  }

  onRoomError(cb: (data: { message: string }) => void): void {
    this.onRoomErrorCallbacks.push(cb);
  }

  onLobbyUpdate(cb: (state: LobbyState) => void): void {
    this.onLobbyUpdateCallbacks.push(cb);
  }

  onGameStarted(cb: () => void): void {
    this.onGameStartedCallbacks.push(cb);
  }

  onState(cb: (state: GameState) => void): void {
    this.onStateCallbacks.push(cb);
  }

  onAssignment(cb: (data: { playerId: string; team: Team }) => void): void {
    this.onAssignCallbacks.push(cb);
  }

  onKill(cb: (data: { killerId: string; victimId: string }) => void): void {
    this.onKillCallbacks.push(cb);
  }

  onFlagCapture(cb: (data: { team: Team; playerId: string }) => void): void {
    this.onFlagCaptureCallbacks.push(cb);
  }
}
