/**
 * Course-access redirects must never depend on the server's own host.
 *
 * Production regression: behind Railway's proxy the standalone Next server
 * rebuilt `request.url` from its bind address, so `new URL(path, request.url)`
 * redirected buyers to https://0.0.0.0:3000/dashboard?access=…. Every
 * non-Telegram outcome now answers with a RELATIVE Location; only a verified
 * private Telegram invite is ever an absolute target.
 *
 * Behaviour of the helper is tested directly; the route's wiring is asserted
 * at source level (the handler needs the Next request context). The full HTTP
 * path is exercised by the isolated production-build E2E harness.
 *
 * Run:  npx tsx --test tests/course-access-redirects.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { relativeRedirect, isLocalPath } from '../lib/http/relative-redirect';
import { isSafeInviteUrl } from '../lib/telegram/channel-access';

const route = fs.readFileSync('app/api/course-access/[courseId]/route.ts', 'utf8');
const code = route.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const COURSE = '22222222-2222-2222-2222-222222222222';
const PRIVATE = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer' };

/** Every non-Telegram Location the route can produce. */
const OUTCOMES = [
  `/login?returnTo=${encodeURIComponent('/dashboard')}`, // signed out
  '/dashboard?access=no_access', // malformed course id
  `/dashboard?access=rate_limited&course=${COURSE}`,
  ...['no_access', 'expired', 'no_payment', 'not_configured', 'telegram_error'].map(
    (r) => `/dashboard?access=${r}&course=${COURSE}`
  ),
  `/course/${COURSE}`, // web-delivered course
];

test('every non-Telegram outcome is a relative Location starting with a single "/"', () => {
  for (const path of OUTCOMES) {
    const res = relativeRedirect(path, PRIVATE);
    const loc = res.headers.get('location')!;
    assert.equal(res.status, 303, path);
    assert.equal(loc, path, 'Location is passed through unchanged, not resolved against any host');
    assert.ok(loc.startsWith('/') && !loc.startsWith('//'), loc);
    assert.equal(/^[a-z]+:/i.test(loc), false, `no scheme: ${loc}`);
    assert.equal(/0\.0\.0\.0|localhost|:3000/.test(loc), false, `no internal host: ${loc}`);
    assert.equal(res.headers.get('cache-control'), 'private, no-store, max-age=0');
  }
});

test('relativeRedirect never emits an external or protocol-relative target', () => {
  for (const bad of ['https://evil.example/x', '//evil.example/x', '/\\evil.example', 'javascript:alert(1)',
    'dashboard', '', '/ok\r\nSet-Cookie: x=1', 'https://0.0.0.0:3000/dashboard']) {
    const loc = relativeRedirect(bad).headers.get('location');
    assert.equal(loc, '/dashboard', JSON.stringify(bad));
  }
  assert.equal(isLocalPath('/dashboard?access=expired'), true);
  assert.equal(isLocalPath('//evil.example'), false);
});

test('route: no redirect is built from request.url or any Host header', () => {
  // Reading ?retry=1 via new URL(request.url).searchParams is fine; RESOLVING a
  // redirect target against request.url (two-argument form) is what broke.
  assert.equal(/new URL\([^,()]+,\s*request\.url\)/.test(code), false, 'no new URL(path, request.url)');
  assert.equal((code.match(/request\.url/g) || []).length, 1, 'request.url is only read for the query string');
  assert.match(code, /new URL\(request\.url\)\.searchParams\.get\('retry'\)/);
  assert.equal(/headers\.get\(['"](host|x-forwarded-host)['"]\)/i.test(code), false, 'Host headers are not trusted');
  assert.equal(/NEXT_PUBLIC_SITE_URL|SITE_URL|APP_URL/.test(code), false, 'no site-URL setting');
  assert.match(code, /function to\(path: string\) \{\s*return relativeRedirect\(path, PRIVATE\);/);
});

test('route: every early return is a relative to(...) redirect except the verified invite', () => {
  const returns = code.match(/return [^;]+;/g) || [];
  const absolute = returns.filter((r) => !/^return to\(/.test(r) && !/^return relativeRedirect\(/.test(r));
  assert.deepEqual(absolute, ['return NextResponse.redirect(decision.href, { status: 303, headers: PRIVATE });']);
  assert.equal((code.match(/NextResponse\.redirect\(/g) || []).length, 1, 'one absolute redirect only');
});

test('route: the Telegram success redirect stays absolute and is gated by isSafeInviteUrl', () => {
  const guard = code.indexOf('if (!isSafeInviteUrl(decision.href))');
  const success = code.indexOf('NextResponse.redirect(decision.href');
  assert.ok(guard > -1 && success > guard, 'invite URL is verified before the absolute redirect');
  assert.equal(isSafeInviteUrl('https://t.me/+AbCdEf123456'), true);
  for (const bad of ['https://0.0.0.0:3000/dashboard', '/dashboard', 'https://t.me/public_channel',
    'http://t.me/+AbCdEf123456', 'https://evil.example/+AbCdEf123456']) {
    assert.equal(isSafeInviteUrl(bad), false, bad);
  }
});
