/**
 * Focused tests for Telegram channel access.
 *
 * Fully isolated: `fetch` is stubbed, so NO real Telegram API call is made and
 * NO invite link is created. No database is touched.
 *
 * Run:  npx tsx --test tests/telegram-channel-access.test.ts
 */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const STANDARD = '11111111-1111-1111-1111-111111111111';
const PRO = '22222222-2222-2222-2222-222222222222';

type FetchBody = { chat_id?: string; member_limit?: number; name?: string; expire_date?: number };

/** Fresh module graph with the given env and a stubbed fetch. */
async function load(
  env: Record<string, string | undefined>,
  responder?: (url: string, init: { body?: string }) => Response
) {
  for (const k of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_STANDARD_CHANNEL_ID', 'TELEGRAM_PRO_CHANNEL_ID']) {
    delete process.env[k];
  }
  Object.assign(process.env, env);

  const calls: { url: string; body: FetchBody }[] = [];
  mock.method(globalThis, 'fetch', async (url: string, init: { body?: string }) => {
    const u = String(url);
    calls.push({ url: u, body: init?.body ? JSON.parse(init.body) : undefined });
    return responder ? responder(u, init) : new Response('{}', { status: 200 });
  });

  const mod = await import(`../lib/telegram/channel-access.ts?bust=${Math.random()}`);
  return { mod, calls };
}

/** Minimal payment shape the module reads. */
function payment(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pay_1',
    order_id: 'NE-1',
    user_id: 'u1',
    course_id: STANDARD,
    amount: 299000,
    currency: 'UZS',
    provider: 'card',
    status: 'approved',
    created_at: new Date().toISOString(),
    ...over,
  };
}

const okInvite = { invite_link: 'https://t.me/+INVITEmock123' };

// ─── Product → channel mapping ────────────────────────────────────────────────

test('standard course maps to the standard channel', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-100123', TELEGRAM_PRO_CHANNEL_ID: '-100999' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );

  const r = await mod.issueChannelInvite(payment({ course_id: STANDARD }));
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.slug, 'standard');
  assert.equal(calls[0].body.chat_id, '-100123', 'must target the STANDARD channel id');
});

test('pro course maps to the pro channel', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-100123', TELEGRAM_PRO_CHANNEL_ID: '-100999' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );

  const r = await mod.issueChannelInvite(payment({ course_id: PRO }));
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.slug, 'pro');
  assert.equal(calls[0].body.chat_id, '-100999', 'must target the PRO channel id');
});

test('unknown product yields no link and no API call', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );

  const r = await mod.issueChannelInvite(payment({ course_id: 'not-a-course' }));
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'unknown_product');
  assert.equal(calls.length, 0, 'must not call Telegram for an unknown product');
});

// ─── Approved vs unapproved ───────────────────────────────────────────────────

test('pending payment cannot obtain a link', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );

  const r = await mod.issueChannelInvite(payment({ status: 'pending' }));
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'not_approved');
  assert.equal(calls.length, 0);
});

test('rejected payment cannot obtain a link', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );
  const r = await mod.issueChannelInvite(payment({ status: 'rejected' }));
  assert.equal(r.ok, false);
  assert.equal(calls.length, 0);
});

test('expired / cancelled payments cannot obtain a link', async () => {
  for (const s of ['expired', 'cancelled'] as const) {
    const { mod, calls } = await load(
      { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
      () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
    );
    const r = await mod.issueChannelInvite(payment({ status: s }));
    assert.equal(r.ok, false, `${s} must not yield a link`);
    assert.equal(calls.length, 0);
  }
});

// ─── Missing configuration ────────────────────────────────────────────────────

test('missing bot token returns a safe config error', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );
  const r = await mod.issueChannelInvite(payment());
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'not_configured');
  assert.equal(calls.length, 0);
});

test('missing channel id returns a safe config error', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );
  const r = await mod.issueChannelInvite(payment());
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'not_configured');
});

test('config error message does not name the missing variable', async () => {
  const { mod } = await load({});
  const r = await mod.issueChannelInvite(payment());
  const msg = !r.ok ? r.message : '';
  assert.doesNotMatch(msg, /TELEGRAM_BOT_TOKEN/);
  assert.doesNotMatch(msg, /CHANNEL_ID/);
});

test('isTelegramConfigured is false without a token', async () => {
  const { mod } = await load({});
  assert.equal(mod.isTelegramConfigured(), false);
});

// ─── API failure handling ─────────────────────────────────────────────────────

test('HTTP error returns api_error, never throws', async () => {
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response('nope', { status: 401 })
  );
  const r = await mod.issueChannelInvite(payment());
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'api_error');
});

test('ok:false response returns api_error', async () => {
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response(JSON.stringify({ ok: false, description: 'not enough rights' }), { status: 200 })
  );
  const r = await mod.issueChannelInvite(payment());
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'api_error');
});

test('network throw is caught', async () => {
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => { throw new Error('ECONNREFUSED'); }
  );
  const r = await mod.issueChannelInvite(payment());
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'api_error');
});

// ─── Link properties ──────────────────────────────────────────────────────────

test('invite is restricted to a single member and has no invented expiry', async () => {
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'mock-token', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );
  await mod.issueChannelInvite(payment());
  assert.equal(calls[0].body.member_limit, 1, 'must be limited to one member');
  assert.equal('expire_date' in calls[0].body, false, 'must NOT invent an expiry');
});

test('bot token never appears in the returned value or error message', async () => {
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: 'super-secret-token-value', TELEGRAM_STANDARD_CHANNEL_ID: '-1', TELEGRAM_PRO_CHANNEL_ID: '-2' },
    () => new Response(JSON.stringify({ ok: false, description: 'x' }), { status: 200 })
  );
  const r = await mod.issueChannelInvite(payment());
  assert.equal(JSON.stringify(r).includes('super-secret-token-value'), false);
});