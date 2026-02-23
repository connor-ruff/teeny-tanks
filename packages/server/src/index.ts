import { createServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@teeny-tanks/shared';
import { RoomManager } from './RoomManager.js';

// Allow PORT to be overridden via environment (e.g. for staging environments).
// Defaults to 3001, which nginx proxies to in production.
const PORT = Number(process.env.PORT) || 3001;

// Bind to loopback only — port 3001 is an internal implementation detail,
// not a public endpoint. nginx is the only thing that should talk to it.
const HOST = '127.0.0.1';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  roomManager.handleConnection(socket);
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Teeny Tanks server listening on ${HOST}:${PORT}`);
});

// Graceful shutdown for pm2 reload / SIGTERM from the OS.
// Calling io.close() fires the 'disconnect' event for every connected socket,
// which causes RoomManager to clean up rooms and stop all game loops cleanly
// before the process exits.
function shutdown(signal: string): void {
  console.log(`Received ${signal} — shutting down gracefully...`);
  io.close(() => {
    httpServer.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
  // Safety valve: force-exit if graceful shutdown stalls (e.g. a hung game loop).
  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
