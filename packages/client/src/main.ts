import Phaser from 'phaser';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './constants.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { RoomScreen } from './ui/RoomScreen.js';
import { LobbyManager } from './ui/LobbyManager.js';
import { HudManager } from './ui/HudManager.js';
import { SocketManager } from './network/SocketManager.js';
import { ApiClient } from './network/ApiClient.js';
import { AuthScreen } from './ui/AuthScreen.js';

// Create API client and auth screen
const apiClient = new ApiClient();
const authScreen = new AuthScreen(apiClient);
const roomScreen = new RoomScreen();
const lobbyManager = new LobbyManager();
const hudManager = new HudManager();

// SocketManager is created after authentication succeeds
let socketManager: SocketManager | null = null;

function initSocketManager(token: string): void {
  socketManager = new SocketManager(token);

  // ── Room screen flow ──
  roomScreen.onCreate = () => {
    socketManager!.createRoom();
  };

  roomScreen.onJoin = (code: string) => {
    socketManager!.joinRoom(code);
  };

  // When a room is successfully created, transition to the lobby
  socketManager.onRoomCreated((data) => {
    roomScreen.hide();
    lobbyManager.setLocalPlayerId(socketManager!.playerId!);
    lobbyManager.setRoomCode(data.code);
    lobbyManager.show();

    // The server broadcasts lobbyUpdate BEFORE emitting roomCreated (inside
    // addPlayer), so the first lobbyUpdate may have arrived when localPlayerId
    // was still null — causing isHost to evaluate as false. Replay the cached
    // lobby state now that the player ID is set so the host UI renders correctly.
    if (socketManager!.latestLobbyState) {
      lobbyManager.updateLobby(socketManager!.latestLobbyState);
    }
  });

  // When successfully joined an existing room, transition to the lobby
  socketManager.onRoomJoined((data) => {
    roomScreen.hide();
    lobbyManager.setLocalPlayerId(socketManager!.playerId!);
    lobbyManager.setRoomCode(data.code);
    lobbyManager.show();

    // Same replay logic as roomCreated
    if (socketManager!.latestLobbyState) {
      lobbyManager.updateLobby(socketManager!.latestLobbyState);
    }
  });

  // Show errors on the room screen (e.g. invalid room code)
  socketManager.onRoomError((data) => {
    roomScreen.showError(data.message);
  });

  // ── Lobby phase ──
  socketManager.onLobbyUpdate((state) => {
    lobbyManager.updateLobby(state);
  });

  lobbyManager.onAssignTeam = (targetPlayerId, team) => {
    socketManager!.assignTeam(targetPlayerId, team);
  };

  lobbyManager.onStartGame = () => {
    socketManager!.startGame();
  };

  lobbyManager.onSetScoreLimit = (scoreLimit: number) => {
    socketManager!.setScoreLimit(scoreLimit);
  };

  // ── Lobby -> game transition ──
  socketManager.onGameStarted(() => {
    hudManager.setScoreLimit(lobbyManager.getScoreLimit());
    lobbyManager.transitionToGame();
    hudManager.show();
  });

  socketManager.onAssignment((_data) => {
    // The assignment is stored on socketManager.team
  });

  // Show victory screen when a team reaches the score limit
  socketManager.onGameOver((data) => {
    hudManager.showGameOver(data.winner, data.scores);
  });

  // Pass to Phaser registry
  game.registry.set('socketManager', socketManager);
}

// ── Logout handling ──
roomScreen.onLogout = () => {
  apiClient.logout();
  authScreen.show();
  roomScreen.hide();
};

// ── Auth flow ──
authScreen.onAuthenticated = () => {
  authScreen.hide();
  const user = apiClient.getUser()!;
  roomScreen.setDisplayName(user.displayName);
  roomScreen.show();
  initSocketManager(apiClient.getToken()!);
};

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
game.registry.set('hudManager', hudManager);
game.registry.set('lobbyManager', lobbyManager);

// Check for existing session on load
async function checkSession(): Promise<void> {
  if (apiClient.isLoggedIn()) {
    const valid = await apiClient.validateSession();
    if (valid) {
      // Skip auth screen — go straight to room screen
      authScreen.hide();
      const user = apiClient.getUser()!;
      roomScreen.setDisplayName(user.displayName);
      roomScreen.show();
      initSocketManager(apiClient.getToken()!);
      return;
    }
  }
  // No valid session — show auth screen, hide room screen
  roomScreen.hide();
  authScreen.show();
}

checkSession();
