/**
 * Edge-safe session decoding.
 *
 * This module must stay free of Node built-ins (`fs`, `path`, `crypto`) so it
 * can be imported from middleware.ts, which runs on the Edge Runtime.
 *
 * It decodes and checks expiry only — it does NOT verify the HMAC signature,
 * because the signing secret is not reachable from the edge. That is safe by
 * design: middleware only chooses redirects. Every route that actually reads
 * or writes data calls lib/permissions, which re-verifies the signature in the
 * Node runtime and re-reads the role from the database.
 */

export interface SessionPayload {
  sub: string;
  email: string;
  role: 'student' | 'admin' | 'instructor';
  name: string;
  iat: number;
  exp: number;
}

function base64UrlToUtf8(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Decode a session cookie without verifying its signature.
 * Returns null for anything malformed or expired.
 */
export function decodeSessionUnverified(raw?: string | null): SessionPayload | null {
  if (!raw) return null;

  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;

  try {
    const payload = JSON.parse(base64UrlToUtf8(raw.slice(0, dot))) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
