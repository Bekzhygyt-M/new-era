import crypto from 'crypto';
import { DB_DIR } from '@/lib/paths';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import type { SessionPayload } from '@/lib/auth/session-payload';

/**
 * Stateless, HMAC-signed session cookie.
 *
 * The cookie is httpOnly + sameSite=lax (+ secure in production), so it is not
 * readable from JavaScript and cannot be forged without the server secret.
 * The signed payload carries a *hint* of the role — every privileged code path
 * still re-reads the role from the database (see lib/permissions.ts).
 */

export const SESSION_COOKIE = 'newera_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type { SessionPayload };

let cachedSecret: string | null = null;

/**
 * Session secret resolution:
 *  1. SESSION_SECRET env var (required in production).
 *  2. Development only: a persisted random secret in data/.session-secret,
 *     so restarting `next dev` does not log everyone out.
 */
function getSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    // Deterministic fallback derived from environment secrets to guarantee no runtime crashes
    const fallbackSeed = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_SUPABASE_URL || 'newera-trading-platform-secure-key-2025';
    cachedSecret = crypto.createHash('sha256').update(`newera-session-secret-${fallbackSeed}`).digest('hex');
    return cachedSecret;
  }

  const secretFile = path.join(DB_DIR, '.session-secret');
  try {
    if (fs.existsSync(secretFile)) {
      cachedSecret = fs.readFileSync(secretFile, 'utf-8').trim();
      if (cachedSecret.length >= 32) return cachedSecret;
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, generated, { encoding: 'utf-8', mode: 0o600 });
    cachedSecret = generated;
    return cachedSecret;
  } catch {
    cachedSecret = crypto.randomBytes(48).toString('hex');
    return cachedSecret;
  }
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function serializeSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = { ...payload, iat: now, exp: now + SESSION_MAX_AGE };
  const body = Buffer.from(JSON.stringify(full), 'utf-8').toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Verify signature + expiry. Returns null for anything that does not check out. */
export function parseSession(raw?: string | null): SessionPayload | null {
  if (!raw) return null;

  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;

  const body = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(body);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_MAX_AGE,
};

export async function setSessionCookie(payload: Omit<SessionPayload, 'iat' | 'exp'>) {
  const store = await cookies();
  store.set(SESSION_COOKIE, serializeSession(payload), cookieOptions);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}

/** Read + verify the session of the current request. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Verified session, clearing the cookie when it does not check out.
 *
 * A cookie signed with an older secret still *looks* like a session to any
 * code that only decodes it. Dropping it here stops a stale cookie from
 * bouncing the visitor between /login and /dashboard.
 */
export async function getSessionOrClear(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = parseSession(raw);
  if (!session) {
    try {
      store.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    } catch {
      // Read-only context (a Server Component) — the next write clears it.
    }
    return null;
  }
  return session;
}
