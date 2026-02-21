import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@teeny-tanks/shared';
import { GameRoom } from './GameRoom.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Omit I and O to avoid confusion with 1 and 0

/**
 * Manages the lifecycle of game rooms: creation, joining, and cleanup.
 * Each room gets an isolated GameRoom with its own game loop and state.
 */
export class RoomManager {
  private rooms = new Map<string, GameRoom>();

  /** Track which room each socket is in for fast lookup on disconnect */
  private socketToRoom = new Map<string, string>();

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

  /**
   * Generate a unique 4-character room code.
   * Retries if the code already exists (extremely unlikely with 24^4 = 331,776 combinations).
   */
  private generateRoomCode(): string {
    let code: string;
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Handle a new socket connection. Sets up room-related event listeners.
   */
  handleConnection(socket: TypedSocket): void {
    socket.on('createRoom', ({ displayName }) => {
      // Prevent joining multiple rooms
      if (this.socketToRoom.has(socket.id)) {
        socket.emit('roomError', { message: 'You are already in a room.' });
        return;
      }

      const code = this.generateRoomCode();
      const room = new GameRoom(this.io, code);
      this.rooms.set(code, room);

      // The creator joins the lobby (and becomes host). Game loop is NOT started
      // until the host explicitly starts it via the startGame event.
      room.addPlayer(socket, displayName);
      this.socketToRoom.set(socket.id, code);

      socket.emit('roomCreated', { code });
      console.log(`Room ${code} created by "${displayName}" (${this.rooms.size} active rooms)`);
    });

    socket.on('joinRoom', ({ code, displayName }) => {
      // Prevent joining multiple rooms
      if (this.socketToRoom.has(socket.id)) {
        socket.emit('roomError', { message: 'You are already in a room.' });
        return;
      }

      // Normalize to uppercase for case-insensitive matching
      const normalizedCode = code.toUpperCase().trim();

      const room = this.rooms.get(normalizedCode);
      if (!room) {
        socket.emit('roomError', { message: `Room "${normalizedCode}" not found. Check the code and try again.` });
        return;
      }

      room.addPlayer(socket, displayName);
      this.socketToRoom.set(socket.id, normalizedCode);

      socket.emit('roomJoined', { code: normalizedCode });
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket.id);
    });
  }

  /**
   * Clean up when a player disconnects: remove from their room, and
   * destroy the room if it is now empty.
   */
  private handleDisconnect(socketId: string): void {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;

    this.socketToRoom.delete(socketId);

    const room = this.rooms.get(code);
    if (!room) return;

    room.removePlayer(socketId);

    // Destroy empty rooms to free resources
    if (room.isEmpty) {
      room.stop();
      this.rooms.delete(code);
      console.log(`Room ${code} destroyed (${this.rooms.size} active rooms)`);
    }
  }
}
