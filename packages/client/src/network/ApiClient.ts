export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  preferredTeam: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

const TOKEN_KEY = 'teeny-tanks-token';
const USER_KEY = 'teeny-tanks-user';

export class ApiClient {
  private token: string | null = null;
  private user: UserProfile | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch {
        this.user = null;
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): UserProfile | null {
    return this.user;
  }

  isLoggedIn(): boolean {
    return this.token !== null;
  }

  private saveAuth(data: AuthResponse): void {
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private async jsonFetch(url: string, options: RequestInit): Promise<Record<string, unknown>> {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server error (${res.status}). Please try again.`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
    return data as Record<string, unknown>;
  }

  async register(username: string, password: string, displayName: string): Promise<AuthResponse> {
    const data = await this.jsonFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName }),
    });
    this.saveAuth(data as unknown as AuthResponse);
    return data as unknown as AuthResponse;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const data = await this.jsonFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    this.saveAuth(data as unknown as AuthResponse);
    return data as unknown as AuthResponse;
  }

  async validateSession(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });
      if (!res.ok) {
        this.logout();
        return false;
      }
      const data = await res.json();
      this.user = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return true;
    } catch {
      this.logout();
      return false;
    }
  }
}
