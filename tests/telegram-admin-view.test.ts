/**
 * Regression tests: an admin viewing a buyer's payment must NOT create,
 * consume, or see the buyer's single-member Telegram invite.
 *
 * Two layers:
 *  - Behaviour: the real payment service + real local JSON driver in an
 *    isolated temp DATA_DIR, with Telegram `fetch` stubbed (no real invites).
 *  - Wiring: the status route and every admin surface that hands payment rows
 *    or notifications to a browser, checked at source level, because those
 *    handlers depend on next/headers request context.
 *
 * The full HTTP path (real route, real signed sessions) is exercised by the
 * isolated end-to-end harness; see the README's testing section.
 *
 * Run:  npx tsx --test tests/telegram-admin-view.test.ts
 */
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const STD = '11111111-1111-1111-1111-111111111111';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'newera-tg-admin-'));
process.env.DATA_DIR = DATA_DIR;
process.env.DATABASE_DRIVER = 'local';
process.env.STORAGE_DRIVER = 'local';
process.env.TELEGRAM_BOT_TOKEN = 'stub-token';
process.env.TELEGRAM_STANDARD_CHANNEL_ID = '-100std';
process.env.TELEGRAM_PRO_CHANNEL_ID = '-100pro';

type Svc = typeof import('../lib/payments/service');
type Tg = typeof import('../lib/telegram/channel-access');
type Db = typeof import('../lib/db')['db'];
let svc: Svc;
let tg: Tg;
let db: Db;

let mints = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  mints++;
  await new Promise((r) => setTimeout(r, 60));
  return new Response(JSON.stringify({ ok: true, result: { invite_link: `https://t.me/+stub${mints}` } }), { status: 200 });
}) as typeof fetch;

function seed() {
  const now = new Date().toISOString();
  const base = {
    amount: 1, currency: 'UZS', provider: 'card', period: 'monthly', created_at: now, course_id: STD,
    expires_at: new Date(Date.now() + 3600e3).toISOString(),
  };
  fs.mkdirSync(path.join(DATA_DIR, 'data'), { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'data', 'db.json'), JSON.stringify({
    profiles: [
      { id: 'buyer', email: 'buyer@test.local', full_name: 'Buyer', role: 'student', password_hash: 'x:x', xp: 0, level: 'beginner', created_at: now },
      { id: 'admin', email: 'admin@test.local', full_name: 'Admin', role: 'admin', password_hash: 'x:x', xp: 0, level: 'beginner', created_at: now },
    ],
    courses: [{ id: STD, slug: 'standard', title: 'Standard' }],
    payments: [
      // Approved before the Telegram feature existed: no invite stored yet.
      { ...base, id: 'p-legacy', order_id: 'A-1', user_id: 'buyer', status: 'approved', approved_at: now },
      { ...base, id: 'p-new', order_id: 'A-2', user_id: 'buyer', status: 'receipt_submitted' },
    ],
    enrollments: [], notifications: [], activity_logs: [],
  }));
}

/**
 * Mirrors the status route's Telegram decision exactly: access is resolved
 * only when the viewer is the buyer. The wiring test below asserts the route
 * really contains this gate, so the two cannot silently drift apart.
 */
async function statusTelegramFor(viewerId: string, paymentId: string) {
  const payment = (await db.getPayment(paymentId))!;
  const isBuyer = payment.user_id === viewerId;
  return isBuyer ? svc.ensureChannelInvite(payment) : null;
}

const stored = async (id: string) => (await db.getPayment(id))!.telegram_invite_link ?? null;
const read = (f: string) => fs.readFileSync(f, 'utf8');

before(async () => {
  seed();
  svc = await import('../lib/payments/service');
  tg = await import('../lib/telegram/channel-access');
  db = (await import('../lib/db')).db;
});
beforeEach(() => { seed(); mints = 0; });
after(() => {
  globalThis.fetch = realFetch;
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

// ─── 1. Buyer gets an invite ─────────────────────────────────────────────────

test('1. buyer viewing their approved payment gets a Standard invite', async () => {
  const access = await statusTelegramFor('buyer', 'p-legacy');
  assert.equal(access?.slug, 'standard');
  assert.ok(access?.inviteUrl);
  assert.equal(mints, 1);
  assert.equal(await stored('p-legacy'), access?.inviteUrl);
});

// ─── 2. Admin view does not create or consume an invite ──────────────────────

test('2a. admin viewing a payment with NO invite yet does not create one', async () => {
  for (let i = 0; i < 3; i++) assert.equal(await statusTelegramFor('admin', 'p-legacy'), null);
  assert.equal(mints, 0, 'admin view must never call Telegram');
  assert.equal(await stored('p-legacy'), null, 'admin view must not persist an invite');
});

test('2b. admin viewing BEFORE the buyer leaves the buyer\'s first invite intact', async () => {
  await statusTelegramFor('admin', 'p-legacy');
  const buyer = await statusTelegramFor('buyer', 'p-legacy');
  assert.equal(mints, 1, 'exactly one invite, created by the buyer');
  assert.equal(await stored('p-legacy'), buyer?.inviteUrl);
});

test('2c. admin viewing AFTER the buyer does not replace or consume the invite', async () => {
  const buyer = await statusTelegramFor('buyer', 'p-legacy');
  await statusTelegramFor('admin', 'p-legacy');
  assert.equal(mints, 1);
  assert.equal(await stored('p-legacy'), buyer?.inviteUrl, 'buyer\'s stored invite unchanged');
});

test('2d. admin APPROVING still issues the invite to the buyer (not to the admin)', async () => {
  const r = await svc.approvePayment('p-new', 'admin@test.local');
  assert.equal(r.ok, true);
  assert.equal(mints, 1);
  const notes = (await db.getNotifications('buyer')).filter((n: { type: string }) => n.type === 'telegram_access');
  assert.equal(notes.length, 1, 'buyer is notified');
  assert.equal((await db.getNotifications('admin')).filter((n: { type: string }) => n.type === 'telegram_access').length, 0);
});

// ─── 3. Admin cannot see the invite link ────────────────────────────────────

test('3a. admin status view returns no invite even when one is stored', async () => {
  await statusTelegramFor('buyer', 'p-legacy');
  assert.ok(await stored('p-legacy'));
  assert.equal(await statusTelegramFor('admin', 'p-legacy'), null);
});

test('3b. withoutInviteLink strips the link and does not mutate the stored row', async () => {
  await statusTelegramFor('buyer', 'p-legacy');
  const row = (await db.getPayment('p-legacy'))!;
  const shown = tg.withoutInviteLink(row);
  assert.equal('telegram_invite_link' in shown, false);
  assert.equal(JSON.stringify(shown).includes('t.me/'), false);
  assert.ok(row.telegram_invite_link, 'original object untouched');
  assert.ok(await stored('p-legacy'), 'database untouched');
  assert.equal(shown.id, row.id);
  assert.equal(shown.status, row.status);
});

test('3c. withoutInviteLink passes null/undefined and rows without a link through', () => {
  assert.equal(tg.withoutInviteLink(null), null);
  assert.equal(tg.withoutInviteLink(undefined), undefined);
  const plain: { id: string; status: string; telegram_invite_link?: string | null } = { id: 'x', status: 'pending' };
  assert.equal(tg.withoutInviteLink(plain), plain);
});

test('3d. withoutNotificationInvite hides only Telegram-access links', () => {
  const tgNote = { type: 'telegram_access', link: 'https://t.me/+secret' };
  const other = { type: 'payment', link: '/payment/1' };
  assert.equal(tg.withoutNotificationInvite(tgNote).link, null);
  assert.equal(tgNote.link, 'https://t.me/+secret', 'original notification untouched');
  assert.equal(tg.withoutNotificationInvite(other), other);
});

// ─── 4. Existing approved payments still work for their buyer ────────────────

test('4. existing approved payment: admin looks first, buyer still gets access', async () => {
  assert.equal(await stored('p-legacy'), null);
  await statusTelegramFor('admin', 'p-legacy');
  const access = await statusTelegramFor('buyer', 'p-legacy');
  assert.equal(access?.slug, 'standard');
  assert.equal(await stored('p-legacy'), access?.inviteUrl);
});

// ─── 5. Repeated buyer requests remain idempotent ────────────────────────────

test('5a. repeated buyer loads reuse one invite', async () => {
  const first = await statusTelegramFor('buyer', 'p-legacy');
  for (let i = 0; i < 5; i++) assert.equal((await statusTelegramFor('buyer', 'p-legacy'))?.inviteUrl, first?.inviteUrl);
  assert.equal(mints, 1);
});

test('5b. concurrent buyer + admin loads still create exactly one invite', async () => {
  const [b1, a, b2] = await Promise.all([
    statusTelegramFor('buyer', 'p-legacy'),
    statusTelegramFor('admin', 'p-legacy'),
    statusTelegramFor('buyer', 'p-legacy'),
  ]);
  assert.equal(mints, 1);
  assert.equal(a, null);
  assert.equal(b1?.inviteUrl, b2?.inviteUrl);
});

// ─── Wiring: the real handlers apply the same rules ──────────────────────────

test('wiring: status route gates Telegram on the buyer, after the ownership check', () => {
  const src = read('app/api/payment/status/route.ts');
  const guard = src.indexOf('payment.user_id !== auth.profile.id && !auth.isAdmin');
  const isBuyer = src.indexOf('const isBuyer = payment.user_id === auth.profile.id;');
  const call = src.indexOf('isBuyer ? await ensureChannelInvite(payment) : null');
  assert.ok(guard > -1, 'ownership/admin guard preserved');
  assert.ok(isBuyer > guard, 'buyer gate after the guard');
  assert.ok(call > isBuyer, 'invite only resolved for the buyer');
  assert.equal((src.match(/ensureChannelInvite\(/g) || []).length, 1, 'no other ungated call');
});

test('wiring: every admin surface that returns payment rows strips the invite', () => {
  const cases: [string, RegExp][] = [
    ['app/api/payment/approve/route.ts', /payment: withoutInviteLink\(result\.payment\)/],
    ['app/api/payment/reject/route.ts', /payment: withoutInviteLink\(result\.payment\)/],
    ['app/api/admin/payments/route.ts', /payments: payments\.map\(withoutInviteLink\)/],
    ['app/api/admin/payments/route.ts', /payment: withoutInviteLink\(payment\)/],
    ['app/admin/payments/page.tsx', /getPayments\(\)\)\.map\(withoutInviteLink\)/],
    ['app/admin/payments/[paymentId]/page.tsx', /initialPayments=\{\[withoutInviteLink\(payment\)\]\}/],
    ['app/admin/analytics/page.tsx', /getPayments\(\)\)\.map\(withoutInviteLink\)/],
    ['app/admin/users/[userId]/page.tsx', /getPayments\(profile\.id\)\)\.map\(withoutInviteLink\)/],
  ];
  for (const [file, re] of cases) assert.match(read(file), re, file);
});

test('wiring: admin notification log hides Telegram invite links', () => {
  assert.match(read('app/admin/notifications/page.tsx'), /\.\.\.withoutNotificationInvite\(n\)/);
  assert.match(read('app/api/admin/notifications/route.ts'), /\.map\(withoutNotificationInvite\)/);
});

test('wiring: no admin page or admin API passes raw payment rows to the browser', () => {
  const files = [
    'app/admin/payments/page.tsx', 'app/admin/analytics/page.tsx', 'app/admin/users/[userId]/page.tsx',
  ];
  for (const f of files) {
    assert.equal(/=\s*await db\.getPayments\([^)]*\);/.test(read(f)), false, `${f} must not keep unstripped rows`);
  }
});
