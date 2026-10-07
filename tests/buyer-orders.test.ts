/**
 * Buyer order discovery ("Kurslarim" → "Buyurtmalarim").
 *
 * The buyer must reach /payment/<id> from a normal link, never by knowing or
 * typing the id — and must never see, or reach, anyone else's payment.
 *
 * Behaviour runs against the REAL payment service and the REAL local JSON
 * driver in an isolated temp DATA_DIR, with Telegram `fetch` stubbed. No real
 * invite is created and the project's own data/db.json is never touched.
 * Route/page wiring is asserted at source level, because those handlers need
 * the Next.js request context.
 *
 * Run:  npx tsx --test tests/buyer-orders.test.ts
 */
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const STD = '11111111-1111-1111-1111-111111111111';
const PRO = '22222222-2222-2222-2222-222222222222';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'newera-orders-'));
process.env.DATA_DIR = DATA_DIR;
process.env.DATABASE_DRIVER = 'local';
process.env.STORAGE_DRIVER = 'local';
process.env.TELEGRAM_BOT_TOKEN = 'stub-token';
process.env.TELEGRAM_STANDARD_CHANNEL_ID = '-100std';
process.env.TELEGRAM_PRO_CHANNEL_ID = '-100pro';

type Svc = typeof import('../lib/payments/service');
type Db = typeof import('../lib/db')['db'];
let svc: Svc;
let db: Db;

let mints: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (_i: unknown, init?: { body?: string }) => {
  mints.push(JSON.parse(init?.body ?? '{}').chat_id);
  await new Promise((r) => setTimeout(r, 40));
  return new Response(JSON.stringify({ ok: true, result: { invite_link: `https://t.me/+stubInvite${mints.length}` } }), { status: 200 });
}) as typeof fetch;

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

function seed() {
  const base = { amount: 1000, currency: 'UZS', provider: 'card', period: 'monthly' };
  fs.mkdirSync(path.join(DATA_DIR, 'data'), { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'data', 'db.json'), JSON.stringify({
    profiles: [
      { id: 'buyer', email: 'buyer@test.local', full_name: 'Buyer', role: 'student', password_hash: 'x:x', xp: 0, level: 'beginner', created_at: iso(0) },
      { id: 'other', email: 'other@test.local', full_name: 'Other', role: 'student', password_hash: 'x:x', xp: 0, level: 'beginner', created_at: iso(0) },
      { id: 'admin', email: 'admin@test.local', full_name: 'Admin', role: 'admin', password_hash: 'x:x', xp: 0, level: 'beginner', created_at: iso(0) },
    ],
    courses: [{ id: STD, slug: 'standard', title: 'Standard Trading' }, { id: PRO, slug: 'pro', title: 'Pro Trading' }],
    payments: [
      // Approved before the Telegram feature existed: no invite stored.
      { ...base, id: 'b-legacy', order_id: 'NE-1', user_id: 'buyer', course_id: STD, status: 'approved', approved_at: iso(5e6), created_at: iso(6e6) },
      { ...base, id: 'b-pro', order_id: 'NE-2', user_id: 'buyer', course_id: PRO, status: 'receipt_submitted', created_at: iso(5e6), expires_at: iso(-3.6e6) },
      { ...base, id: 'b-pending', order_id: 'NE-3', user_id: 'buyer', course_id: STD, status: 'pending', created_at: iso(4e6), expires_at: iso(-3.6e6) },
      { ...base, id: 'b-overdue', order_id: 'NE-4', user_id: 'buyer', course_id: STD, status: 'pending', created_at: iso(3e6), expires_at: iso(6e5) },
      { ...base, id: 'b-rejected', order_id: 'NE-5', user_id: 'buyer', course_id: STD, status: 'rejected', created_at: iso(2e6) },
      { ...base, id: 'b-cancelled', order_id: 'NE-6', user_id: 'buyer', course_id: STD, status: 'cancelled', created_at: iso(1e6) },
      // Belongs to someone else — must never appear for the buyer.
      { ...base, id: 'o-approved', order_id: 'NE-9', user_id: 'other', course_id: STD, status: 'approved', approved_at: iso(1e5), created_at: iso(2e5),
        telegram_invite_link: 'https://t.me/+OTHER_USERS_INVITE' },
    ],
    enrollments: [
      { id: 'e-legacy', user_id: 'buyer', course_id: STD, status: 'active', purchased_at: iso(5e6), expires_at: iso(-20 * 86400e3), source: 'payment' },
    ],
    notifications: [], activity_logs: [],
  }));
}

const read = (f: string) => fs.readFileSync(f, 'utf8');
const stored = async (id: string) => (await db.getPayment(id))!.telegram_invite_link ?? null;

before(async () => {
  seed();
  svc = await import('../lib/payments/service');
  db = (await import('../lib/db')).db;
});
beforeEach(() => { seed(); mints = []; });
after(() => {
  globalThis.fetch = realFetch;
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

// ─── Discovery: the buyer reaches their own payment page from the UI ─────────

test('buyer sees ALL of their own orders, newest first, each with a link', async () => {
  const orders = await svc.listBuyerOrders('buyer');
  assert.deepEqual(orders.map((o) => o.id), ['b-cancelled', 'b-rejected', 'b-overdue', 'b-pending', 'b-pro', 'b-legacy']);
  for (const o of orders) assert.equal(o.href, `/payment/${o.id}`);
});

test('multiple orders are all listed, not one arbitrarily chosen', async () => {
  const orders = await svc.listBuyerOrders('buyer');
  assert.equal(orders.length, 6);
  assert.equal(new Set(orders.map((o) => o.courseId)).size, 2, 'both Standard and Pro orders present');
});

test('order rows carry no Telegram invite link and no other user data', async () => {
  const orders = await svc.listBuyerOrders('buyer');
  const json = JSON.stringify(orders);
  assert.equal(json.includes('t.me/'), false);
  assert.equal(json.includes('telegram_invite_link'), false);
  assert.equal(json.includes('password_hash'), false);
  assert.equal(json.includes('other@test.local'), false);
  assert.deepEqual(Object.keys(orders[0]).sort(),
    ['amount', 'courseId', 'courseTitle', 'createdAt', 'currency', 'href', 'id', 'orderId', 'status']);
});

test('listing orders is read-only: no Telegram call, no write', async () => {
  const before = read(path.join(DATA_DIR, 'data', 'db.json'));
  await svc.listBuyerOrders('buyer');
  await svc.listBuyerOrders('buyer');
  assert.equal(mints.length, 0);
  assert.equal(read(path.join(DATA_DIR, 'data', 'db.json')), before);
});

// ─── Isolation: never another user's payment ─────────────────────────────────

test('buyer never sees another user\'s order', async () => {
  const ids = (await svc.listBuyerOrders('buyer')).map((o) => o.id);
  assert.equal(ids.includes('o-approved'), false);
  assert.deepEqual((await svc.listBuyerOrders('other')).map((o) => o.id), ['o-approved']);
});

test('empty / unknown user id returns nothing', async () => {
  assert.deepEqual(await svc.listBuyerOrders(''), []);
  assert.deepEqual(await svc.listBuyerOrders('nobody'), []);
});

test('changing the id in the URL is still blocked server-side', () => {
  const page = read('app/payment/[paymentId]/page.tsx');
  assert.match(page, /requireUserPage\(/, 'payment page requires a session');
  assert.match(page, /if \(payment\.user_id !== auth\.profile\.id && !auth\.isAdmin\) notFound\(\);/);
  const route = read('app/api/payment/status/route.ts');
  assert.match(route, /requireUserApi\(\)/);
  assert.match(route, /payment\.user_id !== auth\.profile\.id && !auth\.isAdmin/);
  assert.match(route, /Ruxsat berilmagan', 403/);
});

// ─── Statuses shown correctly ────────────────────────────────────────────────

test('pending / review / rejected / cancelled statuses are shown as stored', async () => {
  const by = Object.fromEntries((await svc.listBuyerOrders('buyer')).map((o) => [o.id, o.status]));
  assert.equal(by['b-pending'], 'pending');
  assert.equal(by['b-pro'], 'receipt_submitted');
  assert.equal(by['b-rejected'], 'rejected');
  assert.equal(by['b-cancelled'], 'cancelled');
  assert.equal(by['b-legacy'], 'approved');
});

test('an overdue unpaid order is shown as expired, matching the status page', async () => {
  const o = (await svc.listBuyerOrders('buyer')).find((x) => x.id === 'b-overdue')!;
  assert.equal(o.status, 'expired');
  assert.equal((await db.getPayment('b-overdue'))!.status, 'pending', 'display only — nothing written');
});

test('rejected / cancelled / approved keep their status after the payment window passes', async () => {
  // Real rows always carry expires_at; once it passes, only a still-open
  // pending order may display as expired.
  const raw = JSON.parse(read(path.join(DATA_DIR, 'data', 'db.json')));
  for (const p of raw.payments) {
    if (['b-rejected', 'b-cancelled', 'b-legacy'].includes(p.id)) p.expires_at = iso(3.6e6);
  }
  fs.writeFileSync(path.join(DATA_DIR, 'data', 'db.json'), JSON.stringify(raw));
  const by = Object.fromEntries((await svc.listBuyerOrders('buyer')).map((o) => [o.id, o.status]));
  assert.equal(by['b-rejected'], 'rejected');
  assert.equal(by['b-cancelled'], 'cancelled');
  assert.equal(by['b-legacy'], 'approved');
  assert.equal(by['b-overdue'], 'expired');
});

test('every status the list can produce has a label in all three locales', () => {
  const statuses = ['pending', 'receipt_submitted', 'approved', 'rejected', 'expired', 'cancelled'];
  for (const locale of ['uz', 'ru', 'en']) {
    const m = JSON.parse(read(`messages/${locale}.json`)).myCourses;
    for (const s of statuses) assert.ok(m.status?.[s], `${locale}: myCourses.status.${s}`);
    for (const k of ['ordersTitle', 'ordersSubtitle', 'orderNumber', 'openOrder', 'goToLessons']) {
      assert.ok(m[k], `${locale}: myCourses.${k}`);
    }
  }
});

// ─── Approved → the same single access flow as the dashboard ────────────────

test('approved order opens the course via the access route, which issues the buyer\'s invite', async () => {
  const o = (await svc.listBuyerOrders('buyer')).find((x) => x.id === 'b-legacy')!;
  assert.equal(o.status, 'approved');
  assert.equal(o.href, '/payment/b-legacy', 'the order itself still links to its payment page');
  assert.equal(svc.courseAccessLink(o.courseId).href, `/api/course-access/${STD}`);
  // What the access route does for this buyer on click.
  const access = await svc.getCourseAccess('buyer', o.courseId, { mint: true });
  assert.equal(access.ok && access.delivery === 'telegram' && access.slug, 'standard');
  assert.deepEqual(mints, ['-100std']);
  assert.equal(await stored('b-legacy'), access.ok && access.href);
});

test('existing approved payment: repeat visits from the list stay idempotent', async () => {
  const first = await svc.getCourseAccess('buyer', STD, { mint: true });
  for (let i = 0; i < 4; i++) {
    await svc.listBuyerOrders('buyer');
    const again = await svc.getCourseAccess('buyer', STD, { mint: true });
    assert.equal(again.ok && again.href, first.ok && first.href);
  }
  assert.equal(mints.length, 1);
});

test('a Pro order, once approved, reaches the Pro channel on the buyer\'s click', async () => {
  const r = await svc.approvePayment('b-pro', 'admin@test.local');
  assert.equal(r.ok, true);
  assert.equal((await svc.listBuyerOrders('buyer')).find((o) => o.id === 'b-pro')!.status, 'approved');
  assert.deepEqual(mints, [], 'approval itself mints nothing');
  const access = await svc.getCourseAccess('buyer', PRO, { mint: true });
  assert.equal(access.ok && access.delivery === 'telegram' && access.slug, 'pro');
  assert.deepEqual(mints, ['-100pro']);
});

test('unapproved orders in the list never yield Telegram access', async () => {
  for (const id of ['b-pending', 'b-overdue', 'b-rejected', 'b-cancelled']) {
    assert.equal(await svc.ensureChannelInvite((await db.getPayment(id))!), null, id);
  }
  assert.equal(mints.length, 0);
});

// ─── Wiring: the page and the admin rules ───────────────────────────────────

test('Kurslarim page lists orders for the signed-in profile only', () => {
  const page = read('app/courses/my/page.tsx');
  assert.match(page, /requireUserPage\('\/courses\/my'\)/);
  assert.match(page, /listBuyerOrders\(profile\.id\)/, 'scoped to the verified session profile');
  assert.match(page, /href=\{orderHref\(order\)\}/, 'each order is a normal link');
  assert.match(page, /order\.status === 'approved' \? courseAccessHref\(order\.courseId\) : order\.href/,
    'approved orders open the course via the access flow; others open their payment page');
  assert.equal(/getPayments\(\)/.test(page), false, 'never lists all payments');
  assert.equal(/ensureChannelInvite|getCourseAccess|telegram_invite_link|inviteUrl/.test(page), false,
    'the list never mints or renders an invite');
});

test('the Kurslarim navigation entry still points at /courses/my', () => {
  assert.match(read('components/navbar/Navbar.tsx'), /href="\/courses\/my"/);
});

test('admin behaviour: status route has no Telegram; access route evaluates the session user', () => {
  assert.equal(/ensureChannelInvite|getCourseAccess/.test(read('app/api/payment/status/route.ts')), false);
  assert.match(read('app/api/course-access/[courseId]/route.ts'), /getCourseAccess\(auth\.profile\.id, courseId/);
});

test('admin opening the buyer\'s course access creates nothing', async () => {
  const access = await svc.getCourseAccess('admin', STD, { mint: true });
  assert.equal(access.ok, false);
  assert.equal(mints.length, 0);
  assert.equal(await stored('b-legacy'), null);
});
