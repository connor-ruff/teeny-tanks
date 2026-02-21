/**
 * Manages the DOM-based room selection screen.
 * Players must enter a display name before they can create or join a room.
 */
export class RoomScreen {
  private screenEl: HTMLElement;
  private createBtn: HTMLButtonElement;
  private joinBtn: HTMLButtonElement;
  private codeInput: HTMLInputElement;
  private nameInput: HTMLInputElement;
  private errorEl: HTMLElement;

  /** Called when the player clicks "Create Room" — passes the display name */
  public onCreate: ((displayName: string) => void) | null = null;
  /** Called when the player submits a room code to join — passes code and display name */
  public onJoin: ((code: string, displayName: string) => void) | null = null;

  constructor() {
    this.screenEl = document.getElementById('room-screen')!;
    this.createBtn = document.getElementById('btn-create-room') as HTMLButtonElement;
    this.joinBtn = document.getElementById('btn-join-room') as HTMLButtonElement;
    this.codeInput = document.getElementById('input-room-code') as HTMLInputElement;
    this.nameInput = document.getElementById('input-display-name') as HTMLInputElement;
    this.errorEl = document.getElementById('room-error')!;

    this.createBtn.addEventListener('click', () => {
      this.clearError();
      const name = this.getDisplayName();
      if (!name) return;
      if (this.onCreate) this.onCreate(name);
    });

    this.joinBtn.addEventListener('click', () => this.handleJoin());

    // Allow pressing Enter in the code input to join
    this.codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleJoin();
    });

    // Auto-uppercase as the player types the room code
    this.codeInput.addEventListener('input', () => {
      this.codeInput.value = this.codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
  }

  /**
   * Validate and return the trimmed display name, or null if invalid (shows error).
   */
  private getDisplayName(): string | null {
    const name = this.nameInput.value.trim();
    if (name.length === 0) {
      this.showError('Please enter a display name.');
      this.nameInput.focus();
      return null;
    }
    return name;
  }

  private handleJoin(): void {
    this.clearError();

    const name = this.getDisplayName();
    if (!name) return;

    const code = this.codeInput.value.trim().toUpperCase();
    if (code.length !== 4) {
      this.showError('Room code must be 4 letters.');
      return;
    }

    if (this.onJoin) this.onJoin(code, name);
  }

  showError(message: string): void {
    this.errorEl.textContent = message;
  }

  clearError(): void {
    this.errorEl.textContent = '';
  }

  /**
   * Hide the room screen with a fade-out transition.
   */
  hide(): void {
    this.screenEl.classList.add('hidden');
  }

  /**
   * Show the room screen (e.g. if needed again after disconnect).
   */
  show(): void {
    this.screenEl.classList.remove('hidden');
  }
}
