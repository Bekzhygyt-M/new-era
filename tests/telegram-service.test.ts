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

// Must be set BEFORE the db module loads: it resolves its data dir on import.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'newera-tg-test-'));
process.env.DATA_DIR = DATA_DIR;
process.env.DATABASE_DRIVER = 'local';
process.env.STORAGE_DRIVER = 'local';

type Svc = typeof import('../lib/payments/service');
type Db = typeof import('../lib/db')['db'];
let svc: Svc;
let db: Db;

let mints: { chat_id: string; member_limit: number }[] = [];
let telegramMode: 'ok' | 'fail' = 'ok';

const realFetch = globalThis.fetch;
globalThis.fetch = (async (_input: unknown, init?: { body?: string }) => {
  const body = JSON.parse(init?.body ?? '{}');
  mints.push({ chat_id: body.chat_id, member_limit: body.member_limit });
  await new Promise((r) => setTimeout(r, 120)); // realistic latency to expose races
  if (telegramMode === 'fail') return new Response('{"ok":false}', { status: 500 });
  return new Response(
    JSON.stringify({ ok: true, result: { invite_link: `https://t.me/+stub${mints.length}` } }),
    { status: 200 }
  );
}) as typeof fetch;

function seed() {
  const now = new Date().toISOString();
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
    ],
    enrollments: [], notifications: [], activity_logs: [],
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

test('approval racing the status poll creates one invite; notification matches stored link', async () => {
  const approval = svc.approvePayment('p-std-new', 'admin@test');
  await new Promise((r) => setTimeout(r, 30));
  const poll = await svc.ensureChannelInvite((await db.getPayment('p-std-new'))!);
  const result = await approval;
  assert.equal(result.ok, true);
  assert.equal(mints.length, 1);
  const stored = (await db.getPayment('p-std-new'))!.telegram_invite_link;
  assert.equal(poll?.inviteUrl, stored);
  const notes = await telegramNotes();
  assert.equal(notes.length, 1);
  assert.equal(notes[0].link, stored);
});

test('fresh Pro approval targets the Pro channel', async () => {
  const r = await svc.approvePayment('p-pro-new', 'admin@test');
  assert.equal(r.ok, true);
  assert.equal(mints.length, 1);
  assert.equal(mints[0].chat_id, '-100pro');
  const access = await svc.ensureChannelInvite((await db.getPayment('p-pro-new'))!);
  assert.equal(access?.slug, 'pro');
  assert.equal(mints.length, 1, 'reload reuses the cached Pro invite');
});

test('re-approving an approved payment creates no second invite or notification', async () => {
  await svc.approvePayment('p-std-new', 'admin@test');
  await svc.approvePayment('p-std-new', 'admin@test');
  await svc.approvePayment('p-std-new', 'admin@test');
  assert.equal(mints.length, 1);
  assert.equal((await telegramNotes()).length, 1);
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

  telegramMode = 'ok';
  const retry = await svc.ensureChannelInvite((await db.getPayment('p-std-new'))!);
  assert.equal(retry?.slug, 'standard');
  assert.equal((await db.getPayment('p-std-new'))!.telegram_invite_link, retry?.inviteUrl);
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
