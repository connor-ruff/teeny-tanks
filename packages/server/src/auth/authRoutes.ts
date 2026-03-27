import { IncomingMessage, ServerResponse } from 'http';
import bcrypt from 'bcrypt';
import { createUser, findByUsername, findById } from '../db/UserRepository.js';
import { signToken, verifyToken } from './authMiddleware.js';

const BCRYPT_ROUNDS = 10;

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getTokenFromHeader(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function userProfile(user: { id: number; username: string; display_name: string; preferred_team: string | null; created_at: string }) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    preferredTeam: user.preferred_team,
    createdAt: user.created_at,
  };
}

async function handleRegister(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await parseBody(req);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';

  // Validation
  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return json(res, 400, { error: 'Username must be 3-20 alphanumeric characters (underscores allowed).' });
  }
  if (password.length < 6) {
    return json(res, 400, { error: 'Password must be at least 6 characters.' });
  }
  if (displayName.length < 1 || displayName.length > 16) {
    return json(res, 400, { error: 'Display name must be 1-16 characters.' });
  }

  // Check existing
  if (findByUsername(username)) {
    return json(res, 409, { error: 'Username already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = createUser(username, passwordHash, displayName);
  const token = signToken({ userId: user.id, username: user.username });

  json(res, 201, { token, user: userProfile(user) });
}

async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await parseBody(req);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const user = findByUsername(username);
  if (!user) {
    return json(res, 401, { error: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return json(res, 401, { error: 'Invalid credentials.' });
  }

  const token = signToken({ userId: user.id, username: user.username });
  json(res, 200, { token, user: userProfile(user) });
}

function handleMe(req: IncomingMessage, res: ServerResponse): void {
  const token = getTokenFromHeader(req);
  if (!token) {
    return json(res, 401, { error: 'No token provided.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return json(res, 401, { error: 'Invalid or expired token.' });
  }

  const user = findById(payload.userId);
  if (!user) {
    return json(res, 401, { error: 'User not found.' });
  }

  json(res, 200, { user: userProfile(user) });
}

export async function handleAuthRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url;
  const method = req.method;

  // CORS headers for API routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  try {
    if (method === 'POST' && url === '/api/auth/register') {
      await handleRegister(req, res);
      return true;
    }

    if (method === 'POST' && url === '/api/auth/login') {
      await handleLogin(req, res);
      return true;
    }

    if (method === 'GET' && url === '/api/auth/me') {
      handleMe(req, res);
      return true;
    }
  } catch (err) {
    console.error('Auth route error:', err);
    json(res, 500, { error: 'Internal server error.' });
    return true;
  }

  return false; // not an auth route
}
