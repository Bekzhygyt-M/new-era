/**
 * Behavioural tests for the payment service's Telegram path, against the REAL
 * local JSON driver in an isolated temp DATA_DIR, with Telegram `fetch` stubbed.
 *
 * No real invite is created, no production database is touched, and the
 * project's own data/db.json is never read or written.
 *
 * Run:  npx tsx --test tests/telegram-service.test.ts
 */
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const STD = '11111111-1111-1111-1111-111111111111';
const PRO = '22222222-2222-2222-2222-222222222222';
// Production payment ids are 36-character UUIDs.
const UUID_STD = '9b2f4c1e-7a3d-4e8b-9c6f-2d1a0e5b7c93';
const UUID_PRO = 'c0ffee00-1234-4abc-8def-0123456789ab';

// Must be set BEFORE the db module loads: it resolves its data dir on import.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'newera-tg-test-'));
process.env.DATA_DIR = DATA_DIR;
process.env.DATABASE_DRIVER = 'local';
process.env.STORAGE_DRIVER = 'local';

type Svc = typeof import('../lib/payments/service');
type Db = typeof import('../lib/db')['db'];
let svc: Svc;
let db: Db;

let mints: { chat_id: string; member_limit: number; name?: string }[] = [];
let revokes: { chat_id: string; invite_link: string }[] = [];
let telegramMode: 'ok' | 'fail' = 'ok';

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
  const method = String(input).split('/').pop();
  const body = JSON.parse(init?.body ?? '{}');
  await new Promise((r) => setTimeout(r, 120)); // realistic latency to expose races
  if (method === 'revokeChatInviteLink') {
    revokes.push({ chat_id: body.chat_id, invite_link: body.invite_link });
    return new Response('{"ok":true,"result":{}}', { status: 200 });
  }
  mints.push({ chat_id: body.chat_id, member_limit: body.member_limit, name: body.name });
  // Mirror the real API: names over 32 characters are rejected with HTTP 400.
  if (typeof body.name === 'string' && body.name.length > 32) {
    return new Response('{"ok":false,"error_code":400,"description":"Bad Request: invite link name is too long"}', { status: 400 });
  }
  if (telegramMode === 'fail') return new Response('{"ok":false}', { status: 500 });
  return new Response(
    JSON.stringify({ ok: true, result: { invite_link: `https://t.me/+stubInvite${mints.length}` } }),
    { status: 200 }
  );
}) as typeof fetch;

function seed() {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 20 * 86400e3).toISOString();
  const base = {
    user_id: 'u1', amount: 1, currency: 'UZS', provider: 'card', period: 'monthly', created_at: now,
    expires_at: new Date(Date.now() + 3600e3).toISOString(),
  };
  fs.mkdirSync(path.join(DATA_DIR, 'data'), { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'data', 'db.json'), JSON.stringify({
    profiles: [{ id: 'u1', email: 'u1@test.local', full_name: 'U1', role: 'student', password_hash: 'x:x', xp: 0, level: 'beginner', created_at: now }],
    courses: [{ id: STD, slug: 'standard', title: 'Standard' }, { id: PRO, slug: 'pro', title: 'Pro' }],
    payments: [
      { ...base, id: 'p-std-new', order_id: 'T-1', course_id: STD, status: 'receipt_submitted' },
      { ...base, id: 'p-pro-new', order_id: 'T-2', course_id: PRO, status: 'receipt_submitted' },
      // Approved BEFORE the Telegram feature existed: no invite stored.
      { ...base, id: 'p-std-legacy', order_id: 'T-3', course_id: STD, status: 'approved', approved_at: now },
      { ...base, id: 'p-pending', order_id: 'T-4', course_id: STD, status: 'pending' },
      // u2: enrolled in BOTH products, approved before the Telegram feature
      // existed (NULL invite) — the dashboard-button path must serve them.
      { ...base, user_id: 'u2', id: 'q-std', order_id: 'T-5', course_id: STD, status: 'approved', approved_at: now },
      { ...base, user_id: 'u2', id: 'q-pro', order_id: 'T-6', course_id: PRO, status: 'approved', approved_at: now },
      // u3: a renewal — older approved payment already holds the invite.
      { ...base, user_id: 'u3', id: 'r-old', order_id: 'T-7', course_id: STD, status: 'approved', approved_at: now,
        created_at: new Date(Date.now() - 86400e3).toISOString(), telegram_invite_link: 'https://t.me/+renewalKept1' },
      { ...base, user_id: 'u3', id: 'r-new', order_id: 'T-8', course_id: STD, status: 'approved', approved_at: now },
      // u4: enrolled (e.g. admin grant) but no approved payment at all.
      // u5: enrollment whose access window has ended.
      { ...base, user_id: 'u5', id: 's-exp', order_id: 'T-9', course_id: STD, status: 'approved', approved_at: now },
      // u6: production-shaped rows — 36-character UUID ids, real order numbers.
      { ...base, user_id: 'u6', id: UUID_STD, order_id: 'NE-20261007-A1B2C3', course_id: STD, status: 'approved', approved_at: now },
      { ...base, user_id: 'u6', id: UUID_PRO, order_id: 'NE-20261007-D4E5F6', course_id: PRO, status: 'approved', approved_at: now },
    ],
    enrollments: [
      { id: 'e2s', user_id: 'u2', course_id: STD, status: 'active', purchased_at: now, expires_at: future, source: 'payment' },
      { id: 'e2p', user_id: 'u2', course_id: PRO, status: 'active', purchased_at: now, expires_at: future, source: 'payment' },
      { id: 'e3s', user_id: 'u3', course_id: STD, status: 'active', purchased_at: now, expires_at: future, source: 'payment' },
      { id: 'e4s', user_id: 'u4', course_id: STD, status: 'active', purchased_at: now, expires_at: future, source: 'admin' },
      { id: 'e6s', user_id: 'u6', course_id: STD, status: 'active', purchased_at: now, expires_at: future, source: 'payment' },
      { id: 'e6p', user_id: 'u6', course_id: PRO, status: 'active', purchased_at: now, expires_at: future, source: 'payment' },
      { id: 'e5s', user_id: 'u5', course_id: STD, status: 'active', purchased_at: now,
        expires_at: new Date(Date.now() - 3600e3).toISOString(), source: 'payment' },
    ],
    notifications: [], activity_logs: [],
  }));
}

function configure(on: boolean) {
  for (const k of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_STANDARD_CHANNEL_ID', 'TELEGRAM_PRO_CHANNEL_ID']) delete process.env[k];
  if (on) {
    process.env.TELEGRAM_BOT_TOKEN = 'stub-token';
    process.env.TELEGRAM_STANDARD_CHANNEL_ID = '-100std';
    process.env.TELEGRAM_PRO_CHANNEL_ID = '-100pro';
  }
}

const telegramNotes = async () =>
  (await db.getNotifications('u1')).filter((n: { type: string }) => n.type === 'telegram_access');

before(async () => {
  configure(true); // channel ids are read at module load
  seed();
  svc = await import('../lib/payments/service');
  db = (await import('../lib/db')).db;
});

beforeEach(() => {
  seed();
  mints = [];
  revokes = [];
  telegramMode = 'ok';
  configure(true);
});

after(() => {
  globalThis.fetch = realFetch;
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('existing approved Standard payment lazily receives a Standard invite, persisted', async () => {
  const access = await svc.ensureChannelInvite((await db.getPayment('p-std-legacy'))!);
  assert.equal(access?.slug, 'standard');
  assert.equal(mints.length, 1);
  assert.equal(mints[0].chat_id, '-100std');
  assert.equal(mints[0].member_limit, 1);
  assert.equal((await db.getPayment('p-std-legacy'))!.telegram_invite_link, access?.inviteUrl);
});

test('existing approved payment: repeated loads reuse the persisted invite', async () => {
  const first = await svc.ensureChannelInvite((await db.getPayment('p-std-legacy'))!);
  for (let i = 0; i < 5; i++) {
    const again = await svc.ensureChannelInvite((await db.getPayment('p-std-legacy'))!);
    assert.equal(again?.inviteUrl, first?.inviteUrl);
  }
  assert.equal(mints.length, 1);
});

test('concurrent first loads (two tabs) create exactly one invite', async () => {
  const [a, b] = await Promise.all([
    svc.ensureChannelInvite((await db.getPayment('p-std-legacy'))!),
    svc.ensureChannelInvite((await db.getPayment('p-std-legacy'))!),
  ]);
  assert.equal(mints.length, 1);
  assert.equal(a?.inviteUrl, b?.inviteUrl);
  assert.equal((await db.getPayment('p-std-legacy'))!.telegram_invite_link, a?.inviteUrl);
});

test('approval creates NO invite and no Telegram notification (minted only on the buyer\'s click)', async () => {
  const r = await svc.approvePayment('p-std-new', 'admin@test');
  assert.equal(r.ok, true);
  assert.equal(mints.length, 0, 'approval must not call Telegram');
  assert.equal((await db.getPayment('p-std-new'))!.telegram_invite_link ?? null, null);
  assert.equal((await telegramNotes()).length, 0);
  const note = (await db.getNotifications('u1')).find((n: { type: string }) => n.type === 'payment_approved');
  assert.equal(note?.link, '/dashboard', 'approval notification points at the dashboard CTA');
});

test('fresh Pro approval, then the buyer\'s click, targets the Pro channel', async () => {
  const r = await svc.approvePayment('p-pro-new', 'admin@test');
  assert.equal(r.ok, true);
  assert.equal(mints.length, 0);
  const access = await svc.getCourseAccess('u1', PRO, { mint: true });
  assert.equal(access.ok && access.delivery === 'telegram' && access.slug, 'pro');
  assert.equal(mints.length, 1);
  assert.equal(mints[0].chat_id, '-100pro');
  const again = await svc.getCourseAccess('u1', PRO, { mint: true });
  assert.equal(again.ok && again.href, access.ok && access.href);
  assert.equal(mints.length, 1, 'reload reuses the cached Pro invite');
});

test('re-approving an approved payment creates no invite, notification or enrollment', async () => {
  await svc.approvePayment('p-std-new', 'admin@test');
  await svc.approvePayment('p-std-new', 'admin@test');
  await svc.approvePayment('p-std-new', 'admin@test');
  assert.equal(mints.length, 0);
  assert.equal((await telegramNotes()).length, 0);
  const approvals = (await db.getNotifications('u1')).filter((n: { type: string }) => n.type === 'payment_approved');
  assert.equal(approvals.length, 1);
  const enrollments = (await db.getEnrollments('u1')).filter((e: { course_id: string }) => e.course_id === STD);
  assert.equal(enrollments.length, 1);
});

test('Telegram failure does not break approval; next load retries', async () => {
  telegramMode = 'fail';
  const r = await svc.approvePayment('p-std-new', 'admin@test');
  assert.equal(r.ok, true, 'approval must succeed even when Telegram fails');
  assert.equal((await db.getPayment('p-std-new'))!.status, 'approved');
  assert.equal(await db.hasEnrollment('u1', STD), true);
  assert.equal((await db.getPayment('p-std-new'))!.telegram_invite_link ?? null, null);
  assert.equal((await telegramNotes()).length, 0);

  // The buyer's click while Telegram is down: a controlled, retryable denial.
  const down = await svc.getCourseAccess('u1', STD, { mint: true });
  assert.equal(!down.ok && down.reason, 'telegram_error');
  assert.equal((await db.getPayment('p-std-new'))!.telegram_invite_link ?? null, null, 'nothing half-written');
  assert.equal((await db.getPayment('p-std-new'))!.status, 'approved', 'payment untouched by the failure');

  telegramMode = 'ok';
  const retry = await svc.getCourseAccess('u1', STD, { mint: true });
  assert.equal(retry.ok && retry.delivery === 'telegram' && retry.slug, 'standard');
  assert.equal((await db.getPayment('p-std-new'))!.telegram_invite_link, retry.ok && retry.href);
});

test('missing configuration: approval still succeeds, no Telegram call, no access', async () => {
  configure(false);
  const r = await svc.approvePayment('p-std-new', 'admin@test');
  assert.equal(r.ok, true);
  assert.equal(await db.hasEnrollment('u1', STD), true);
  assert.equal(mints.length, 0);
  assert.equal(await svc.ensureChannelInvite((await db.getPayment('p-std-legacy'))!), null);
  assert.equal(mints.length, 0);
});

test('unapproved payment never yields access or a Telegram call', async () => {
  assert.equal(await svc.ensureChannelInvite((await db.getPayment('p-pending'))!), null);
  assert.equal(mints.length, 0);
});

// ─── Central access flow: getCourseAccess (dashboard "Darslarga o‘tish") ─────

test('access: legacy approved buyer with NULL invite gets Standard → Standard, Pro → Pro', async () => {
  const std = await svc.getCourseAccess('u2', STD, { mint: true });
  const pro = await svc.getCourseAccess('u2', PRO, { mint: true });
  assert.ok(std.ok && pro.ok);
  assert.deepEqual(mints.map((m) => m.chat_id), ['-100std', '-100pro']);
  assert.ok(mints.every((m) => m.member_limit === 1));
  assert.equal(std.ok && std.href, (await db.getPayment('q-std'))!.telegram_invite_link);
  assert.equal(pro.ok && pro.href, (await db.getPayment('q-pro'))!.telegram_invite_link);
  assert.notEqual(std.ok && std.href, pro.ok && pro.href);
});

test('access: repeated and concurrent clicks are idempotent (one invite per payment)', async () => {
  const burst = await Promise.all(Array.from({ length: 6 }, () => svc.getCourseAccess('u2', STD, { mint: true })));
  assert.equal(mints.length, 1, 'concurrent first clicks share one mint');
  assert.equal(new Set(burst.map((b) => b.ok && b.href)).size, 1);
  for (let i = 0; i < 5; i++) await svc.getCourseAccess('u2', STD, { mint: true });
  assert.equal(mints.length, 1, 'sequential re-clicks reuse the stored invite');
});

test('access: rendering (mint:false) and courseAccessLink never call Telegram or write', async () => {
  const before = fs.readFileSync(path.join(DATA_DIR, 'data', 'db.json'), 'utf8');
  const r = await svc.getCourseAccess('u2', STD);
  assert.equal(r.ok && r.href, `/api/course-access/${STD}`);
  assert.deepEqual(svc.courseAccessLink(STD), { delivery: 'telegram', href: `/api/course-access/${STD}`, available: true });
  assert.deepEqual(svc.courseAccessLink(PRO), { delivery: 'telegram', href: `/api/course-access/${PRO}`, available: true });
  assert.deepEqual(svc.courseAccessLink('33333333-3333-3333-3333-333333333333'),
    { delivery: 'web', href: '/course/33333333-3333-3333-3333-333333333333', available: true });
  assert.equal(mints.length, 0);
  assert.equal(fs.readFileSync(path.join(DATA_DIR, 'data', 'db.json'), 'utf8'), before);
});

test('access: a user can never obtain another buyer\'s invite', async () => {
  const owner = await svc.getCourseAccess('u2', PRO, { mint: true });
  assert.ok(owner.ok);
  mints = [];
  // u1 owns no PRO enrollment; u4/u5 none either; unknown user nothing.
  for (const uid of ['u1', 'u3', 'u4', 'nobody', '']) {
    const r = await svc.getCourseAccess(uid, PRO, { mint: true });
    assert.equal(r.ok, false, uid);
    assert.equal(JSON.stringify(r).includes('t.me'), false, `${uid} must not see an invite`);
  }
  assert.equal(mints.length, 0);
});

test('access: denials are typed — no enrollment, expired, no approved payment', async () => {
  const none = await svc.getCourseAccess('u1', STD, { mint: true });
  assert.equal(!none.ok && none.reason, 'no_access');
  const expired = await svc.getCourseAccess('u5', STD, { mint: true });
  assert.equal(!expired.ok && expired.reason, 'expired');
  const grant = await svc.getCourseAccess('u4', STD, { mint: true });
  assert.equal(!grant.ok && grant.reason, 'no_payment');
  assert.equal(mints.length, 0);
});

test('access: missing Telegram config is a controlled not_configured denial with zero calls', async () => {
  configure(false);
  const r = await svc.getCourseAccess('u2', STD, { mint: true });
  assert.equal(!r.ok && r.reason, 'not_configured');
  assert.equal(svc.courseAccessLink(STD).available, false);
  assert.equal(mints.length, 0);
});

test('access: a renewal reuses the invite already held by an older approved payment', async () => {
  const r = await svc.getCourseAccess('u3', STD, { mint: true });
  assert.equal(r.ok && r.href, 'https://t.me/+renewalKept1');
  assert.equal(mints.length, 0);
});

test('access: stale invite recovery (replace) revokes the old link and stores exactly one new one', async () => {
  const first = await svc.getCourseAccess('u2', STD, { mint: true });
  const [a, b] = await Promise.all([
    svc.getCourseAccess('u2', STD, { mint: true, replace: true }),
    svc.getCourseAccess('u2', STD, { mint: true, replace: true }),
  ]);
  assert.equal(mints.length, 2, 'one original + one replacement, even for a double click');
  assert.equal(a.ok && a.href, b.ok && b.href);
  assert.notEqual(a.ok && a.href, first.ok && first.href);
  assert.equal(revokes.length, 1);
  assert.equal(revokes[0].invite_link, first.ok && first.href);
  assert.equal((await db.getPayment('q-std'))!.telegram_invite_link, a.ok && a.href);
});

test('access: a corrupted / non-invite stored value is never returned; it is replaced', async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'data', 'db.json'), 'utf8'));
  raw.payments.find((p: { id: string }) => p.id === 'q-pro').telegram_invite_link = 'https://evil.example/+abcdefgh';
  fs.writeFileSync(path.join(DATA_DIR, 'data', 'db.json'), JSON.stringify(raw));
  const r = await svc.getCourseAccess('u2', PRO, { mint: true });
  assert.ok(r.ok && /^https:\/\/t\.me\/\+stubInvite/.test(r.href));
  assert.equal(mints.length, 1);
  assert.equal(revokes.length, 0, 'an unsafe value is not sent to Telegram for revocation');
});

test('access: production-shaped 36-char UUID payments mint successfully (name <= 32), Standard and Pro', async () => {
  assert.equal(UUID_STD.length, 36);
  const std = await svc.getCourseAccess('u6', STD, { mint: true });
  const pro = await svc.getCourseAccess('u6', PRO, { mint: true });
  assert.ok(std.ok && std.delivery === 'telegram', `Standard denied: ${JSON.stringify(!std.ok && std.reason)}`);
  assert.ok(pro.ok && pro.delivery === 'telegram', `Pro denied: ${JSON.stringify(!pro.ok && pro.reason)}`);
  assert.deepEqual(mints.map((m) => m.chat_id), ['-100std', '-100pro']);
  assert.deepEqual(mints.map((m) => m.name), ['access-NE-20261007-A1B2C3', 'access-NE-20261007-D4E5F6']);
  assert.ok(mints.every((m) => (m.name ?? '').length <= 32));
  assert.match(std.ok ? std.href : '', /^https:\/\/t\.me\/\+/);
  assert.equal((await db.getPayment(UUID_STD))!.telegram_invite_link, std.ok && std.href);
  // Idempotent on reload.
  await svc.getCourseAccess('u6', STD, { mint: true });
  await svc.getCourseAccess('u6', PRO, { mint: true });
  assert.equal(mints.length, 2);
});
