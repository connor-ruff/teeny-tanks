import { Server, Socket } from 'socket.io';
import {
  GameState,
  PlayerInput,
  Team,
  LobbyPlayer,
  LobbyState,
  ClientToServerEvents,
  ServerToClientEvents,
  TICK_INTERVAL,
  SCORE_LIMIT_DEFAULT,
  SCORE_LIMIT_MIN,
  SCORE_LIMIT_MAX,
} from '@teeny-tanks/shared';
import { createTank } from './entities/Tank.js';
import { createFlag } from './entities/Flag.js';
import { updatePhysics } from './systems/PhysicsSystem.js';
import { updateProjectiles } from './systems/ProjectileSystem.js';
import { updateFlags } from './systems/FlagSystem.js';
import { resolveCollisions } from './systems/CollisionSystem.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * A single game room with its own isolated state, game loop, and player set.
 * All broadcasts are scoped to the Socket.IO room identified by `roomCode`.
 *
 * Lifecycle: lobby phase (players join, host assigns teams) -> game phase (game loop runs).
 */
export class GameRoom {
  private state: GameState;
  private inputs = new Map<string, PlayerInput>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** Ordered list of players in the lobby (preserves join order) */
  private lobbyPlayers: LobbyPlayer[] = [];

  /** Socket references keyed by player ID, needed for registering game-phase listeners */
  private sockets = new Map<string, TypedSocket>();

  /** The socket ID of the player who created the room */
  private hostId: string | null = null;

  /** Whether the game has been started (prevents re-starting) */
  private gameStarted = false;

  /** Configurable score limit — host can change this in the lobby */
  private scoreLimit: number = SCORE_LIMIT_DEFAULT;

  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents>,
    public readonly roomCode: string,
  ) {
    this.state = {
      tick: 0,
      tanks: {},
      projectiles: [],
      flags: {
        red: createFlag('red'),
        blue: createFlag('blue'),
      },
      scores: { red: 0, blue: 0 },
    };
  }

  get size(): number {
    return this.lobbyPlayers.length;
  }

  get isEmpty(): boolean {
    return this.lobbyPlayers.length === 0;
  }

  /**
   * Add a player to the lobby phase. The first player to join becomes the host.
   * Does NOT start the game loop -- the host must explicitly start the game.
   */
  addPlayer(socket: TypedSocket, displayName: string): void {
    const player: LobbyPlayer = {
      id: socket.id,
      displayName,
      team: null, // unassigned until the host sets it
    };

    this.lobbyPlayers.push(player);
    this.sockets.set(socket.id, socket);

    // First player in the room becomes the host
    if (!this.hostId) {
      this.hostId = socket.id;
    }

    // Join the Socket.IO room so broadcasts are scoped
    socket.join(this.roomCode);

    // ── Lobby-phase event listeners ──

    // Host can assign teams
    socket.on('assignTeam', ({ targetPlayerId, team }) => {
      if (socket.id !== this.hostId) return; // silently ignore non-host attempts
      if (this.gameStarted) return;

      const target = this.lobbyPlayers.find(p => p.id === targetPlayerId);
      if (!target) return;

      target.team = team;
      this.broadcastLobbyState();
    });

    // Host can change the score limit during the lobby phase
    socket.on('setScoreLimit', ({ scoreLimit }) => {
      if (socket.id !== this.hostId) return;
      if (this.gameStarted) return;

      // Clamp to valid range to prevent invalid values
      const clamped = Math.max(SCORE_LIMIT_MIN, Math.min(SCORE_LIMIT_MAX, Math.floor(scoreLimit)));
      this.scoreLimit = clamped;
      this.broadcastLobbyState();
    });

    // Host can start the game
    socket.on('startGame', () => {
      if (socket.id !== this.hostId) return;
      if (this.gameStarted) return;

      // Auto-assign any unassigned players before starting, alternating teams
      let redCount = this.lobbyPlayers.filter(p => p.team === 'red').length;
      let blueCount = this.lobbyPlayers.filter(p => p.team === 'blue').length;
      for (const p of this.lobbyPlayers) {
        if (p.team === null) {
          p.team = redCount <= blueCount ? 'red' : 'blue';
          if (p.team === 'red') redCount++;
          else blueCount++;
        }
      }

      this.gameStarted = true;
      this.initializeGame();
    });

    this.broadcastLobbyState();
    console.log(`[${this.roomCode}] Player "${displayName}" (${socket.id}) joined lobby (${this.size} players)`);
  }

  /**
   * Transition from lobby to game: create tanks, wire up input listeners,
   * notify all clients, and start the server game loop.
   */
  private initializeGame(): void {
    // Create tank entities for every player using their assigned teams.
    // Track per-team slot index so each player gets a unique spawn position.
    const teamSlotCounters: Record<Team, number> = { red: 0, blue: 0 };
    for (const player of this.lobbyPlayers) {
      const team = player.team as Team; // guaranteed non-null after auto-assign
      const slotIndex = teamSlotCounters[team]++;
      const tank = createTank(player.id, team, slotIndex, player.displayName);
      this.state.tanks[player.id] = tank;

      const socket = this.sockets.get(player.id);
      if (!socket) continue;

      // Tell each player their final assignment
      socket.emit('playerAssignment', { playerId: player.id, team });

      // Register per-player input handler for the game phase
      socket.on('playerInput', (input: PlayerInput) => {
        this.inputs.set(player.id, input);
      });
    }

    // Signal all clients to transition out of the lobby into the game
    this.io.to(this.roomCode).emit('gameStarted');

    // Start the authoritative game loop
    this.start();
  }

  removePlayer(socketId: string): void {
    const idx = this.lobbyPlayers.findIndex(p => p.id === socketId);
    if (idx === -1) return;

    this.lobbyPlayers.splice(idx, 1);
    this.sockets.delete(socketId);
    delete this.state.tanks[socketId];
    this.inputs.delete(socketId);

    // Drop any flags this player was carrying
    for (const flag of Object.values(this.state.flags)) {
      if (flag.carrierId === socketId) {
        flag.carrierId = null;
      }
    }

    // If the host left, promote the next player (or null if room is empty)
    if (this.hostId === socketId) {
      this.hostId = this.lobbyPlayers.length > 0 ? this.lobbyPlayers[0].id : null;
      if (this.hostId) {
        console.log(`[${this.roomCode}] Host left, promoted ${this.hostId}`);
      }
    }

    console.log(`[${this.roomCode}] Player ${socketId} left (${this.size} players)`);

    // Broadcast updated lobby state if still in lobby phase
    if (!this.gameStarted && !this.isEmpty) {
      this.broadcastLobbyState();
    }

    // Stop the game loop if the room is now empty (cleanup handled by RoomManager)
    if (this.isEmpty) {
      this.stop();
    }
  }

  hasPlayer(socketId: string): boolean {
    return this.lobbyPlayers.some(p => p.id === socketId);
  }

  /**
   * Send the current lobby state to everyone in the room.
   * Called whenever players join/leave or team assignments change.
   */
  private broadcastLobbyState(): void {
    const state: LobbyState = {
      roomCode: this.roomCode,
      hostId: this.hostId!,
      players: this.lobbyPlayers,
      scoreLimit: this.scoreLimit,
    };
    this.io.to(this.roomCode).emit('lobbyUpdate', state);
  }

  start(): void {
    if (this.intervalId) return;

    const dt = TICK_INTERVAL / 1000; // seconds

    this.intervalId = setInterval(() => {
      const now = Date.now();

      // Run systems
      updatePhysics(this.state, this.inputs, dt);
      resolveCollisions(this.state, this.inputs);

      const projEvents = updateProjectiles(this.state, this.inputs, dt, now);
      for (const kill of projEvents.kills) {
        this.io.to(this.roomCode).emit('playerKilled', kill);
      }

      const flagEvents = updateFlags(this.state);
      for (const capture of flagEvents.captures) {
        this.io.to(this.roomCode).emit('flagCaptured', capture);
        console.log(`[${this.roomCode}] Team ${capture.team} scored! (${this.state.scores.red} - ${this.state.scores.blue})`);

        // Check win condition after each capture
        if (this.state.scores[capture.team] >= this.scoreLimit) {
          this.io.to(this.roomCode).emit('gameOver', { winner: capture.team, scores: { ...this.state.scores } });
          console.log(`[${this.roomCode}] Game over — ${capture.team} wins!`);
          this.stop();
          return;
        }
      }

      this.state.tick++;

      // Broadcast state only to players in this room
      this.io.to(this.roomCode).emit('gameState', this.state);
    }, TICK_INTERVAL);

    console.log(`[${this.roomCode}] Game loop started at ${1000 / TICK_INTERVAL} ticks/sec`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log(`[${this.roomCode}] Game loop stopped`);
    }
  }
}
