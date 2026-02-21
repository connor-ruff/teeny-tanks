import { createServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@teeny-tanks/shared';
import { RoomManager } from './RoomManager.js';

const PORT = 3001;

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

httpServer.listen(PORT, () => {
  console.log(`Teeny Tanks server listening on port ${PORT}`);
});
