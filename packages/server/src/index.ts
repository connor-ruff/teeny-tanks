import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '@teeny-tanks/shared';
import { RoomManager } from './RoomManager.js';
import { initDatabase } from './db/database.js';
import { handleAuthRoute } from './auth/authRoutes.js';
import { verifyToken } from './auth/authMiddleware.js';
import { findById } from './db/UserRepository.js';

// Initialize database before anything else
initDatabase();

// Allow PORT to be overridden via environment (e.g. for staging environments).
// Defaults to 3001, which nginx proxies to in production.
const PORT = Number(process.env.PORT) || 3001;

// Bind to loopback only — port 3001 is an internal implementation detail,
// not a public endpoint. nginx is the only thing that should talk to it.
const HOST = '127.0.0.1';

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Route API requests
  if (req.url?.startsWith('/api/')) {
    const handled = await handleAuthRoute(req, res);
    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  // Non-API requests get a simple 200 (Socket.IO handles its own upgrade)
  res.writeHead(200);
  res.end('Teeny Tanks server');
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Skip HTTP long-polling handshake — go straight to WebSocket.
  // Reduces connection latency and CPU overhead on small instances.
  transports: ['websocket'],
});

// Socket.IO auth middleware — reject unauthenticated connections
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(new Error('Invalid or expired token'));
  }

  const user = findById(payload.userId);
  if (!user) {
    return next(new Error('User not found'));
  }

  // Attach user data to socket for use throughout the connection
  socket.data.userId = user.id;
  socket.data.username = user.username;
  socket.data.displayName = user.display_name;

  next();
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (user: ${socket.data.displayName})`);
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
