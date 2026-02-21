import { Team, LobbyState, LobbyPlayer } from '@teeny-tanks/shared';

/**
 * Manages the DOM-based lobby overlay.
 * Displays team columns with player chips. The host can click buttons to
 * assign players to teams; non-host players see a read-only view and a
 * "Waiting for host to start..." message.
 */
export class LobbyManager {
  private overlayEl: HTMLElement;
  private startBtn: HTMLButtonElement;
  private statusEl: HTMLElement;
  private roomCodeEl: HTMLElement;
  private teamRedEl: HTMLElement;
  private teamBlueEl: HTMLElement;
  private teamUnassignedEl: HTMLElement;

  /** The local player's socket ID */
  private localPlayerId: string | null = null;
  /** Whether the local player is the host */
  private isHost = false;

  // Callbacks
  public onStartGame: (() => void) | null = null;
  public onAssignTeam: ((targetPlayerId: string, team: Team | null) => void) | null = null;

  constructor() {
    this.overlayEl = document.getElementById('lobby-overlay')!;
    this.startBtn = document.getElementById('btn-start-game') as HTMLButtonElement;
    this.statusEl = document.getElementById('lobby-status')!;
    this.roomCodeEl = document.getElementById('lobby-room-code')!;
    this.teamRedEl = document.getElementById('lobby-team-red')!;
    this.teamBlueEl = document.getElementById('lobby-team-blue')!;
    this.teamUnassignedEl = document.getElementById('lobby-team-unassigned')!;

    this.startBtn.addEventListener('click', () => {
      if (this.onStartGame) this.onStartGame();
    });
  }

  /**
   * Set the local player's ID so we can determine host status from lobby updates.
   */
  setLocalPlayerId(id: string): void {
    this.localPlayerId = id;
  }

  /**
   * Display the room code prominently in the lobby header.
   */
  setRoomCode(code: string): void {
    this.roomCodeEl.textContent = code;
  }

  /**
   * Update the entire lobby UI from a LobbyState broadcast.
   * This is the single source of truth for the lobby display.
   */
  updateLobby(state: LobbyState): void {
    this.isHost = this.localPlayerId === state.hostId;

    // Show/hide the start button based on host status
    if (this.isHost) {
      this.startBtn.style.display = '';
      this.statusEl.textContent = '';
    } else {
      this.startBtn.style.display = 'none';
      this.statusEl.className = 'status-text';
      this.statusEl.innerHTML = '<span class="connecting-spinner"></span> Waiting for host to start...';
    }

    // Partition players into team columns
    const redPlayers = state.players.filter(p => p.team === 'red');
    const bluePlayers = state.players.filter(p => p.team === 'blue');
    const unassigned = state.players.filter(p => p.team === null);

    this.renderTeamList(this.teamRedEl, redPlayers, state.hostId, 'red');
    this.renderTeamList(this.teamBlueEl, bluePlayers, state.hostId, 'blue');
    this.renderTeamList(this.teamUnassignedEl, unassigned, state.hostId, null);
  }

  /**
   * Render a list of player chips into a team column container.
   * If the local player is the host, each chip includes buttons to move
   * the player to a different team.
   */
  private renderTeamList(
    container: HTMLElement,
    players: LobbyPlayer[],
    hostId: string,
    currentTeam: Team | null,
  ): void {
    container.innerHTML = '';

    if (players.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'player-list-empty';
      empty.textContent = currentTeam === null ? 'No unassigned players' : 'No players';
      empty.style.fontSize = '11px';
      empty.style.padding = '4px';
      container.appendChild(empty);
      return;
    }

    for (const player of players) {
      const chip = document.createElement('div');
      chip.className = 'lobby-player-chip';

      // Player name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = player.displayName;
      chip.appendChild(nameSpan);

      // Host badge
      if (player.id === hostId) {
        const badge = document.createElement('span');
        badge.className = 'host-badge';
        badge.textContent = 'Host';
        chip.appendChild(badge);
      }

      // Self indicator
      if (player.id === this.localPlayerId) {
        nameSpan.style.color = 'var(--text-primary)';
        nameSpan.style.fontWeight = '700';
      }

      // Host sees assignment buttons to move players to other teams
      if (this.isHost) {
        if (currentTeam !== 'red') {
          const toRedBtn = document.createElement('button');
          toRedBtn.className = 'team-assign-btn to-red';
          toRedBtn.textContent = 'Red';
          toRedBtn.addEventListener('click', () => {
            if (this.onAssignTeam) this.onAssignTeam(player.id, 'red');
          });
          chip.appendChild(toRedBtn);
        }

        if (currentTeam !== 'blue') {
          const toBlueBtn = document.createElement('button');
          toBlueBtn.className = 'team-assign-btn to-blue';
          toBlueBtn.textContent = 'Blue';
          toBlueBtn.addEventListener('click', () => {
            if (this.onAssignTeam) this.onAssignTeam(player.id, 'blue');
          });
          chip.appendChild(toBlueBtn);
        }

        // If already assigned, allow moving back to unassigned
        if (currentTeam !== null) {
          const unassignBtn = document.createElement('button');
          unassignBtn.className = 'team-assign-btn';
          unassignBtn.textContent = 'X';
          unassignBtn.title = 'Unassign';
          unassignBtn.addEventListener('click', () => {
            if (this.onAssignTeam) this.onAssignTeam(player.id, null);
          });
          chip.appendChild(unassignBtn);
        }
      }

      container.appendChild(chip);
    }
  }

  /**
   * Transition from lobby to game. Fades out the overlay.
   */
  transitionToGame(): void {
    this.overlayEl.classList.add('hidden');
  }

  /**
   * Show the lobby again (e.g., if disconnected).
   */
  show(): void {
    this.overlayEl.classList.remove('hidden');
  }

  setError(message: string): void {
    this.statusEl.className = 'status-text error';
    this.statusEl.textContent = message;
  }
}
