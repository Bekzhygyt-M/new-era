/**
 * Order-number allocation (production regression).
 *
 * The Supabase driver used to read a `head: true` count through unwrap(),
 * which returns `data` — always null for a head request — so every order got
 * sequence 000001 and the second order of any day hit the unique constraint
 * on payments.order_id ("Serverda xatolik yuz berdi" at checkout).
 *
 * These tests drive the REAL Supabase adapter (lib/db/supabase.ts) through the
 * real supabase-js client against an in-memory PostgREST stand-in installed
 * on `fetch`. The stand-in enforces `order_id` uniqueness exactly like
 * Postgres (HTTP 409, code 23505, payments_order_id_key) and returns the head
 * count in Content-Range. No network, no real database.
 *
 * Run:  npx tsx --test tests/order-number.test.ts
 */
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOrderId,
  insertWithUniqueOrderId,
  isOrderIdConflict,
  orderDateStamp,
} from '../lib/payments/order-number';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://stub.supabase.local';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-role-key-not-real';

type Row = Record<string, unknown>;
let payments: Row[] = [];
let insertCalls = 0;
let countCalls = 0;
let latencyMs = 0;
let failNextInsertWith: { status: number; body: Row } | null = null;

const ORDER_RE = /^NE-\d{8}-\d{6}$/;
const today = orderDateStamp();

const realFetch = globalThis.fetch;
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

/** Minimal PostgREST behaviour for the three calls savePayment makes. */
async function postgrest(input: unknown, init: RequestInit = {}): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : (input as Request).url);
  const method = (init.method || 'GET').toUpperCase();
  const table = url.pathname.split('/').pop();
  if (latencyMs) await new Promise((r) => setTimeout(r, Math.random() * latencyMs));

  if (table === 'platform_settings') return json(200, []); // → defaults

  if (table === 'payments' && method === 'HEAD') {
    countCalls++;
    return json(200, null, { 'content-range': `*/${payments.length}` });
  }

  if (table === 'payments' && method === 'POST') {
    insertCalls++;
    if (failNextInsertWith) {
      const f = failNextInsertWith;
      failNextInsertWith = null;
      return json(f.status, f.body);
    }
    const body = JSON.parse(String(init.body)) as Row;
    const row = Array.isArray(body) ? body[0] : body;
    // Postgres: unique (order_id). Check-and-insert is atomic here (single
    // JS turn), exactly like a real unique index.
    if (payments.some((p) => p.order_id === row.order_id)) {
      return json(409, {
        code: '23505',
        message: 'duplicate key value violates unique constraint "payments_order_id_key"',
        details: `Key (order_id)=(${row.order_id}) already exists.`,
        hint: null,
      });
    }
    const created = { id: `id-${payments.length + 1}`, created_at: new Date().toISOString(), ...row };
    payments.push(created);
    return json(201, created);
  }

  if (table === 'payments' && method === 'PATCH') {
    const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
    const row = payments.find((p) => p.id === idEq);
    if (!row) return json(406, { code: 'PGRST116', message: 'no rows' });
    Object.assign(row, JSON.parse(String(init.body)));
    return json(200, row);
  }

  if (table === 'payments' && method === 'GET') {
    const orderEq = url.searchParams.get('order_id')?.replace(/^eq\./, '');
    const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
    return json(200, payments.filter((p) => (!orderEq || p.order_id === orderEq) && (!idEq || p.id === idEq)));
  }

  return json(404, { message: `unexpected ${method} ${url.pathname}` });
}

type Adapter = typeof import('../lib/db/supabase')['supabaseAdapter'];
let adapter: Adapter;

/** Production rows exactly as they exist today: every one numbered …-000001. */
function seedProductionShape() {
  payments = [
    { id: 'p1', order_id: 'NE-20260926-000001', status: 'approved' },
    { id: 'p2', order_id: 'NE-20261002-000001', status: 'approved' },
    { id: 'p3', order_id: 'NE-20261006-000001', status: 'approved' },
    { id: 'p4', order_id: `NE-${today}-000001`, status: 'pending' }, // today's first order
  ];
}

const newOrder = (n = 1) => ({
  user_id: `user-${n}`,
  course_id: '11111111-1111-1111-1111-111111111111',
  amount: 299000,
  currency: 'UZS',
  provider: 'click',
  status: 'pending' as const,
  period: 'monthly',
});

before(async () => {
  globalThis.fetch = postgrest as typeof fetch;
  adapter = (await import('../lib/db/supabase')).supabaseAdapter;
});
beforeEach(() => {
  seedProductionShape();
  insertCalls = 0;
  countCalls = 0;
  latencyMs = 0;
  failNextInsertWith = null;
});
after(() => {
  globalThis.fetch = realFetch;
});

// ─── The production failure ──────────────────────────────────────────────────

test('second order of the day no longer collides (was: duplicate payments_order_id_key)', async () => {
  const before = payments.map((p) => p.order_id);
  const created = await adapter.savePayment(newOrder() as never);
  assert.match(String(created.order_id), ORDER_RE);
  assert.equal(created.order_id, `NE-${today}-000005`, 'sequence = existing payments + 1');
  assert.equal(insertCalls, 1, 'first candidate is already free — no retry needed');
  assert.deepEqual(payments.slice(0, 4).map((p) => p.order_id), before, 'existing order ids unchanged');
});

test('several sequential orders on one day each get a distinct, increasing number', async () => {
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) ids.push(String((await adapter.savePayment(newOrder(i) as never)).order_id));
  assert.deepEqual(ids, [5, 6, 7, 8, 9].map((n) => formatOrderId(today, n)));
  assert.equal(new Set(payments.map((p) => p.order_id)).size, payments.length);
});

test('a stale/low count still ends with a unique number (retries past taken ones)', async () => {
  // Gaps or deleted rows can make count+1 point at an existing number.
  payments.push({ id: 'x5', order_id: formatOrderId(today, 5) }, { id: 'x6', order_id: formatOrderId(today, 6) });
  payments.splice(0, 2); // count is now 4 → candidate 000005 is taken, so is 000006
  const created = await adapter.savePayment(newOrder() as never);
  assert.match(String(created.order_id), ORDER_RE);
  assert.equal(created.order_id, formatOrderId(today, 7));
  assert.equal(insertCalls, 3);
});

// ─── Concurrency ─────────────────────────────────────────────────────────────

test('20 simultaneous checkouts: all succeed, all order numbers unique', async () => {
  latencyMs = 25; // random interleaving between count and insert
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => adapter.savePayment(newOrder(i) as never)));
  const ids = results.map((r) => String(r.order_id));
  assert.equal(results.length, 20);
  assert.ok(ids.every((id) => ORDER_RE.test(id)), ids.join(','));
  assert.equal(new Set(ids).size, 20, 'no two requests share an order number');
  assert.equal(new Set(payments.map((p) => p.order_id)).size, payments.length, 'table has no duplicates');
  assert.ok(insertCalls > 20, `races were actually exercised (inserts=${insertCalls})`);
});

// ─── Unchanged behaviour ─────────────────────────────────────────────────────

test('non-order-id insert errors are thrown immediately, not retried', async () => {
  failNextInsertWith = {
    status: 400,
    body: { code: '23514', message: 'new row violates check constraint "payments_amount_check"', details: null },
  };
  await assert.rejects(() => adapter.savePayment(newOrder() as never), /savePayment:insert: .*payments_amount_check/);
  assert.equal(insertCalls, 1);
});

test('a unique violation on a DIFFERENT column is not mistaken for an order-number clash', async () => {
  failNextInsertWith = {
    status: 409,
    body: { code: '23505', message: 'duplicate key value violates unique constraint "payments_pkey"', details: 'Key (id)=(x) already exists.' },
  };
  await assert.rejects(() => adapter.savePayment(newOrder() as never), /payments_pkey/);
  assert.equal(insertCalls, 1);
});

test('caller-supplied order_id is inserted as-is; other fields keep their defaults', async () => {
  const created = await adapter.savePayment({ ...newOrder(), order_id: 'NE-20990101-123456', currency: undefined, provider: undefined } as never);
  assert.equal(created.order_id, 'NE-20990101-123456');
  assert.equal(created.currency, 'UZS');
  assert.equal(created.provider, 'manual');
  assert.equal(created.status, 'pending');
  assert.equal(countCalls, 0, 'no allocation when an order id is given');
  assert.ok(created.expires_at);
});

test('updating an existing payment never allocates or changes its order number', async () => {
  const updated = await adapter.savePayment({ id: 'p4', status: 'expired' } as never);
  assert.equal(insertCalls, 0);
  assert.equal(countCalls, 0);
  assert.equal(payments.find((p) => p.id === 'p4')!.order_id, `NE-${today}-000001`);
  assert.equal(payments.find((p) => p.id === 'p4')!.status, 'expired');
  assert.equal(updated.order_id, `NE-${today}-000001`);
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

test('format matches every existing production order id', () => {
  for (const id of ['NE-20260926-000001', 'NE-20261002-000001', 'NE-20261006-000001', 'NE-20261007-000001']) {
    assert.match(id, ORDER_RE);
  }
  assert.equal(formatOrderId('20261007', 5), 'NE-20261007-000005');
  assert.equal(orderDateStamp(new Date('2026-10-07T23:59:59Z')), '20261007');
});

test('isOrderIdConflict recognises only the order_id unique violation', () => {
  assert.equal(isOrderIdConflict({ code: '23505', message: 'duplicate key value violates unique constraint "payments_order_id_key"' }), true);
  assert.equal(isOrderIdConflict({ code: '23505', message: 'x', details: 'Key (order_id)=(NE-1) already exists.' }), true);
  assert.equal(isOrderIdConflict({ code: '23505', message: 'duplicate key value violates unique constraint "payments_pkey"' }), false);
  assert.equal(isOrderIdConflict({ code: '23514', message: 'order_id check' }), false);
  assert.equal(isOrderIdConflict(null), false);
});

test('allocation gives up after a bounded number of conflicts instead of looping forever', async () => {
  let tries = 0;
  await assert.rejects(
    () =>
      insertWithUniqueOrderId({
        countExisting: async () => 0,
        tryInsert: async () => {
          tries++;
          return { ok: false, conflict: true, error: new Error('dup') };
        },
        maxAttempts: 4,
      }),
    /dup/
  );
  assert.equal(tries, 4);
});
