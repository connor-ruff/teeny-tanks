import { ApiClient } from '../network/ApiClient.js';

/**
 * Manages the DOM-based authentication screen.
 * Players must log in or register before accessing the game.
 */
export class AuthScreen {
  private screenEl: HTMLElement;
  private loginForm: HTMLElement;
  private registerForm: HTMLElement;

  // Login elements
  private loginUsername: HTMLInputElement;
  private loginPassword: HTMLInputElement;
  private loginBtn: HTMLButtonElement;
  private loginError: HTMLElement;

  // Register elements
  private regUsername: HTMLInputElement;
  private regPassword: HTMLInputElement;
  private regDisplayName: HTMLInputElement;
  private regBtn: HTMLButtonElement;
  private regError: HTMLElement;

  // Toggle links
  private showRegisterLink: HTMLElement;
  private showLoginLink: HTMLElement;

  /** Called when auth succeeds (login or register) */
  public onAuthenticated: (() => void) | null = null;

  constructor(private apiClient: ApiClient) {
    this.screenEl = document.getElementById('auth-screen')!;
    this.loginForm = document.getElementById('auth-login-form')!;
    this.registerForm = document.getElementById('auth-register-form')!;

    this.loginUsername = document.getElementById('login-username') as HTMLInputElement;
    this.loginPassword = document.getElementById('login-password') as HTMLInputElement;
    this.loginBtn = document.getElementById('btn-login') as HTMLButtonElement;
    this.loginError = document.getElementById('login-error')!;

    this.regUsername = document.getElementById('reg-username') as HTMLInputElement;
    this.regPassword = document.getElementById('reg-password') as HTMLInputElement;
    this.regDisplayName = document.getElementById('reg-display-name') as HTMLInputElement;
    this.regBtn = document.getElementById('btn-register') as HTMLButtonElement;
    this.regError = document.getElementById('reg-error')!;

    this.showRegisterLink = document.getElementById('show-register')!;
    this.showLoginLink = document.getElementById('show-login')!;

    this.setupListeners();
  }

  private setupListeners(): void {
    this.loginBtn.addEventListener('click', () => this.handleLogin());
    this.loginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });

    this.regBtn.addEventListener('click', () => this.handleRegister());
    this.regDisplayName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleRegister();
    });

    this.showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.loginForm.style.display = 'none';
      this.registerForm.style.display = 'block';
      this.loginError.textContent = '';
    });

    this.showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.registerForm.style.display = 'none';
      this.loginForm.style.display = 'block';
      this.regError.textContent = '';
    });
  }

  private async handleLogin(): Promise<void> {
    this.loginError.textContent = '';
    const username = this.loginUsername.value.trim();
    const password = this.loginPassword.value;

    if (!username || !password) {
      this.loginError.textContent = 'Please enter username and password.';
      return;
    }

    this.loginBtn.disabled = true;
    try {
      await this.apiClient.login(username, password);
      if (this.onAuthenticated) this.onAuthenticated();
    } catch (err) {
      this.loginError.textContent = err instanceof Error ? err.message : 'Login failed.';
    } finally {
      this.loginBtn.disabled = false;
    }
  }

  private async handleRegister(): Promise<void> {
    this.regError.textContent = '';
    const username = this.regUsername.value.trim();
    const password = this.regPassword.value;
    const displayName = this.regDisplayName.value.trim();

    if (!username || !password || !displayName) {
      this.regError.textContent = 'Please fill in all fields.';
      return;
    }

    this.regBtn.disabled = true;
    try {
      await this.apiClient.register(username, password, displayName);
      if (this.onAuthenticated) this.onAuthenticated();
    } catch (err) {
      this.regError.textContent = err instanceof Error ? err.message : 'Registration failed.';
    } finally {
      this.regBtn.disabled = false;
    }
  }

  hide(): void {
    this.screenEl.classList.add('hidden');
  }

  show(): void {
    this.screenEl.classList.remove('hidden');
    // Reset to login form
    this.loginForm.style.display = 'block';
    this.registerForm.style.display = 'none';
    this.loginError.textContent = '';
    this.regError.textContent = '';
  }
}
