import Phaser from 'phaser';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './constants.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { RoomScreen } from './ui/RoomScreen.js';
import { LobbyManager } from './ui/LobbyManager.js';
import { HudManager } from './ui/HudManager.js';
import { SocketManager } from './network/SocketManager.js';

// Create shared managers
const socketManager = new SocketManager();
const roomScreen = new RoomScreen();
const lobbyManager = new LobbyManager();
const hudManager = new HudManager();

// ── Room screen flow ──
// Player enters a display name, then creates or joins a room.

roomScreen.onCreate = (displayName: string) => {
  socketManager.createRoom(displayName);
};

roomScreen.onJoin = (code: string, displayName: string) => {
  socketManager.joinRoom(code, displayName);
};

// When a room is successfully created, transition to the lobby
socketManager.onRoomCreated((data) => {
  roomScreen.hide();
  lobbyManager.setLocalPlayerId(socketManager.playerId!);
  lobbyManager.setRoomCode(data.code);
  lobbyManager.show();
});

// When successfully joined an existing room, transition to the lobby
socketManager.onRoomJoined((data) => {
  roomScreen.hide();
  lobbyManager.setLocalPlayerId(socketManager.playerId!);
  lobbyManager.setRoomCode(data.code);
  lobbyManager.show();
});

// Show errors on the room screen (e.g. invalid room code)
socketManager.onRoomError((data) => {
  roomScreen.showError(data.message);
});

// ── Lobby phase ──
// Server broadcasts lobby state; lobby manager renders it.
// Host can assign teams and start the game.

socketManager.onLobbyUpdate((state) => {
  lobbyManager.updateLobby(state);
});

lobbyManager.onAssignTeam = (targetPlayerId, team) => {
  socketManager.assignTeam(targetPlayerId, team);
};

lobbyManager.onStartGame = () => {
  socketManager.startGame();
};

lobbyManager.onSetScoreLimit = (scoreLimit: number) => {
  socketManager.setScoreLimit(scoreLimit);
};

// ── Lobby -> game transition ──
// The server emits 'gameStarted' when the host clicks start.

socketManager.onGameStarted(() => {
  // Pass the lobby-configured score limit to the HUD before showing it
  hudManager.setScoreLimit(lobbyManager.getScoreLimit());
  lobbyManager.transitionToGame();
  hudManager.show();
});

// Handle server assignment (team assignment arrives just before gameStarted)
socketManager.onAssignment((_data) => {
  // The assignment is stored on socketManager.team — no lobby UI update needed
  // since the lobby is about to close.
});

// Show victory screen when a team reaches the score limit
socketManager.onGameOver((data) => {
  hudManager.showGameOver(data.winner);
});

// Phaser game config
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  backgroundColor: '#ede4d3',
  parent: document.body,
  scene: [BootScene, GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

const game = new Phaser.Game(config);

// Pass shared managers to scenes via Phaser's registry
game.registry.set('socketManager', socketManager);
game.registry.set('hudManager', hudManager);
game.registry.set('lobbyManager', lobbyManager);
