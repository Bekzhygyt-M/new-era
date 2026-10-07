import { NextResponse } from 'next/server';

/**
 * Same-site redirect with a RELATIVE Location header.
 *
 * Never built from `request.url`: behind Railway's proxy the standalone server
 * reconstructs that URL from its bind address (`HOSTNAME=0.0.0.0`, `PORT`), so
 * an absolute redirect sent buyers to https://0.0.0.0:3000/…. A relative
 * Location is resolved by the browser against the public URL it requested, so
 * no Host / X-Forwarded-Host header is trusted and no site-URL setting is
 * needed. Anything that is not a single-slash local path falls back to
 * /dashboard, so this can never become an open redirect.
 * (NextResponse.redirect rejects relative URLs, hence the plain response.)
 */
export function relativeRedirect(
  path: string,
  headers: Record<string, string> = {},
  status: 302 | 303 | 307 = 303
): NextResponse {
  const safe = isLocalPath(path) ? path : '/dashboard';
  return new NextResponse(null, { status, headers: { ...headers, Location: safe } });
}

/** "/x…" only — rejects absolute URLs, protocol-relative "//host" and "/\\host". */
export function isLocalPath(path: unknown): path is string {
  return typeof path === 'string' && /^\/(?![\/\\])/.test(path) && !/[\r\n]/.test(path);
}
