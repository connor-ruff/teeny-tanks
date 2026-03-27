/**
 * Manages the DOM-based room selection screen.
 * Display name comes from the authenticated user profile, not from an input field.
 */
export class RoomScreen {
  private screenEl: HTMLElement;
  private createBtn: HTMLButtonElement;
  private joinBtn: HTMLButtonElement;
  private codeInput: HTMLInputElement;
  private errorEl: HTMLElement;
  private userLabel: HTMLElement;
  private logoutBtn: HTMLButtonElement;

  /** Called when the player clicks "Create Room" */
  public onCreate: (() => void) | null = null;
  /** Called when the player submits a room code to join */
  public onJoin: ((code: string) => void) | null = null;
  /** Called when the player clicks "Log Out" */
  public onLogout: (() => void) | null = null;

  constructor() {
    this.screenEl = document.getElementById('room-screen')!;
    this.createBtn = document.getElementById('btn-create-room') as HTMLButtonElement;
    this.joinBtn = document.getElementById('btn-join-room') as HTMLButtonElement;
    this.codeInput = document.getElementById('input-room-code') as HTMLInputElement;
    this.errorEl = document.getElementById('room-error')!;
    this.userLabel = document.getElementById('room-user-label')!;
    this.logoutBtn = document.getElementById('btn-logout') as HTMLButtonElement;

    this.createBtn.addEventListener('click', () => {
      this.clearError();
      if (this.onCreate) this.onCreate();
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

    this.logoutBtn.addEventListener('click', () => {
      if (this.onLogout) this.onLogout();
    });
  }

  /** Set the display name shown on the room screen */
  setDisplayName(name: string): void {
    this.userLabel.textContent = `Playing as ${name}`;
  }

  private handleJoin(): void {
    this.clearError();

    const code = this.codeInput.value.trim().toUpperCase();
    if (code.length !== 4) {
      this.showError('Room code must be 4 letters.');
      return;
    }

    if (this.onJoin) this.onJoin(code);
  }

  showError(message: string): void {
    this.errorEl.textContent = message;
  }

  clearError(): void {
    this.errorEl.textContent = '';
  }

  hide(): void {
    this.screenEl.classList.add('hidden');
  }

  show(): void {
    this.screenEl.classList.remove('hidden');
  }
}
