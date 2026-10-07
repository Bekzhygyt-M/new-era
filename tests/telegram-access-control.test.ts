/**
 * Access-control and wiring checks for Telegram course access.
 *
 * Course access is opened ONLY through GET /api/course-access/<courseId>
 * (the dashboard's "Darslarga o‘tish"). The payment status endpoint and page
 * deal with payment state only and never mint, read out or render an invite.
 *
 * Fully static: reads the sources and asserts guard ordering. No HTTP server,
 * no database, no Telegram calls. Behaviour is covered by
 * tests/telegram-service.test.ts and the isolated browser E2E harness.
 *
 * Run:  npx tsx --test tests/telegram-access-control.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/payment/status/route.ts', 'utf8');
const access = fs.readFileSync('app/api/course-access/[courseId]/route.ts', 'utf8');
const service = fs.readFileSync('lib/payments/service.ts', 'utf8');
const client = fs.readFileSync('app/payment/[paymentId]/PaymentStatusClient.tsx', 'utf8');

test('status route is authenticated and owner-or-admin only', () => {
  assert.match(route, /requireUserApi\(\)/, 'must require a signed-in user');
  assert.match(route, /Ruxsat berilmagan'\s*,\s*403/);
});

test('status route never touches Telegram', () => {
  assert.equal(/ensureChannelInvite|getCourseAccess|telegram_invite_link|issueChannelInvite/.test(route), false);
  assert.equal(/telegram\s*:/.test(route), false, 'no telegram field in the JSON response');
});

test('access route: session first, then id validation, then the central decision', () => {
  const auth = access.indexOf('await getAuth()');
  const unauth = access.indexOf('if (!auth) return to(`/login');
  const uuid = access.indexOf('if (!UUID.test(courseId))');
  const decide = access.indexOf('getCourseAccess(auth.profile.id, courseId');
  assert.ok(auth > -1 && unauth > auth && uuid > unauth && decide > uuid);
  assert.equal((access.match(/getCourseAccess\(/g) || []).length, 1, 'exactly one access decision');
  assert.equal(/ensureChannelInvite|issueChannelInvite/.test(access), false, 'no Telegram logic in the route');
});

test('access route identifies the user only from the verified session', () => {
  assert.equal(/searchParams\.get\('(userId|user|paymentId)'\)/.test(access), false);
  assert.match(access, /getCourseAccess\(auth\.profile\.id,/);
});

test('access route only ever redirects to a safe private invite, never caches it', () => {
  const guard = access.indexOf('if (!isSafeInviteUrl(decision.href))');
  const redirect = access.lastIndexOf('NextResponse.redirect(decision.href');
  assert.ok(guard > -1 && redirect > guard);
  assert.match(access, /'Cache-Control': 'private, no-store, max-age=0'/);
  assert.match(access, /'Referrer-Policy': 'no-referrer'/);
});

test('stale-link replacement is rate-limited per user and course', () => {
  assert.match(access, /rateLimit\(`course-access:replace:\$\{auth\.profile\.id\}:\$\{courseId\}`, 3,/);
});

test('getCourseAccess checks the enrollment before any invite work', () => {
  const fn = service.slice(service.indexOf('export async function getCourseAccess'));
  const enrol = fn.indexOf('db.hasEnrollment(userId, courseId)');
  const deny = fn.indexOf("return deny(enrollment ? 'expired' : 'no_access')");
  const mint = fn.indexOf('ensureChannelInvite(payment');
  assert.ok(enrol > -1 && deny > enrol && mint > deny);
  assert.match(fn, /p\.user_id === userId && p\.course_id === courseId && p\.status === 'approved'/);
});

test('getCourseAccess only mints when explicitly asked (mint: true)', () => {
  const fn = service.slice(service.indexOf('export async function getCourseAccess'));
  const gate = fn.indexOf('if (!options.mint)');
  const mint = fn.indexOf('ensureChannelInvite(payment');
  assert.ok(gate > -1 && gate < mint);
});

test('ensureChannelInvite refuses anything not approved', () => {
  const fn = service.slice(service.indexOf('export async function ensureChannelInvite'));
  assert.match(fn, /if \(payment\.status !== 'approved'\) return null;/);
});

test('ensureChannelInvite refuses when Telegram is unconfigured', () => {
  const fn = service.slice(service.indexOf('export async function ensureChannelInvite'));
  assert.match(fn, /if \(!isTelegramConfigured\(\)\) return null;/);
});

test('ensureChannelInvite reuses a safe cached link before minting', () => {
  const fn = service.slice(service.indexOf('export async function ensureChannelInvite'));
  const cached = fn.indexOf('isSafeInviteUrl(payment.telegram_invite_link)');
  const mint = fn.indexOf('issueChannelInvite(payment)');
  assert.ok(cached > -1 && cached < mint, 'cached link must short-circuit before a new mint');
});

test('issueChannelInvite also refuses unapproved payments (defence in depth)', () => {
  const tg = fs.readFileSync('lib/telegram/channel-access.ts', 'utf8');
  assert.match(tg, /if \(payment\.status !== 'approved'\)/);
});

test('approval makes no Telegram call; it stays inside the fresh-transition guard', () => {
  const fn = service.slice(service.indexOf('export async function approvePayment'), service.indexOf('async function persistInvite'));
  assert.match(fn, /if \(!result\.was_already_approved && existing\.status !== 'approved'\)/);
  assert.equal(/ensureChannelInvite|issueChannelInvite|getCourseAccess/.test(fn), false,
    'approval must never mint: a one-seat invite is created only by the buyer\'s click');
  assert.match(fn, /link: '\/dashboard'/);
});

test('invite is persisted best-effort and never breaks approval', () => {
  const fn = service.slice(service.indexOf('async function persistInvite'));
  assert.match(fn, /try\s*{/);
  assert.match(fn, /catch/);
});

test('payment page requests no invite and renders no Telegram CTA', () => {
  assert.equal(/telegram|inviteUrl|t\.me/i.test(client.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  assert.equal(/\/course\/\$\{/.test(client), false, 'no indirect hop through /course/<id>');
  assert.match(client, /href="\/dashboard"/);
});

test('payment page polls only while the order can still change', () => {
  assert.match(client, /new Set<Status>\(\['pending', 'receipt_submitted'\]\)/);
  assert.match(client, /if \(!LIVE\.has\(status\)\) return;/);
  assert.match(client, /data\.status === 'approved' && previous !== 'approved'/);
});

test('UI never renders a fallback or hardcoded t.me link', () => {
  for (const f of ['app/dashboard/page.tsx', 'app/courses/my/page.tsx', 'app/payment/[paymentId]/PaymentStatusClient.tsx']) {
    assert.equal(/https:\/\/t\.me\//.test(fs.readFileSync(f, 'utf8')), false, f);
  }
});
