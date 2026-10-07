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
// ─── Invite name length (production regression) ─────────────────────────────
// Telegram rejects createChatInviteLink when `name` exceeds 32 characters.
// Production payment ids are 36-character UUIDs, so `access-<uuid>` (43 chars)
// failed every real request while short test ids passed.

const REAL_UUID = '9b2f4c1e-7a3d-4e8b-9c6f-2d1a0e5b7c93';

test('real 36-char UUID payment id: invite name is <= 32 chars and uses the order number', async () => {
  assert.equal(REAL_UUID.length, 36);
  const { mod, calls } = await load(
    { TELEGRAM_BOT_TOKEN: 'stub-token', TELEGRAM_STANDARD_CHANNEL_ID: '-100std', TELEGRAM_PRO_CHANNEL_ID: '-100pro' },
    () => new Response(JSON.stringify({ ok: true, result: okInvite }), { status: 200 })
  );
  for (const course of [STANDARD, PRO]) {
    const r = await mod.issueChannelInvite(payment({ id: REAL_UUID, order_id: 'NE-20261007-A1B2C3', course_id: course }));
    assert.equal(r.ok, true);
  }
  assert.equal(calls.length, 2);
  for (const c of calls) {
    assert.ok(c.body.name!.length <= 32, `name too long: ${c.body.name!.length}`);
    assert.equal(c.body.name, 'access-NE-20261007-A1B2C3');
    assert.equal(c.body.member_limit, 1);
  }
  mock.restoreAll();
});

test('invite name is deterministic and always <= 32 chars, whatever the ids look like', async () => {
  const { mod } = await load({});
  const cases = [
    { id: REAL_UUID, order_id: 'NE-20261007-A1B2C3' },
    { id: REAL_UUID, order_id: '' }, // missing order number → clipped UUID
    { id: REAL_UUID, order_id: 'NE-' + 'X'.repeat(80) }, // pathological order number
    { id: 'pay_mulh9h5j8d1e8n', order_id: 'NE-20260901-ZZZZZZ' }, // local-driver ids
  ];
  for (const c of cases) {
    const a = mod.inviteLinkName(c);
    assert.ok(a.length <= mod.INVITE_NAME_MAX && a.length <= 32, `${a} (${a.length})`);
    assert.ok(a.startsWith('access-'));
    assert.equal(mod.inviteLinkName(c), a, 'same payment → same name');
  }
  assert.equal(mod.inviteLinkName({ id: REAL_UUID, order_id: '' }), `access-${REAL_UUID}`.slice(0, 32));
  mock.restoreAll();
});

// ─── Diagnostic logging of Telegram failures (sanitized) ─────────────────────

const SECRET_TOKEN = '987654321:AAHsuperSecretBotTokenValue_abcdefXYZ';
const SECRET_CHANNEL = '-1009876543210';

/** Captures console.error lines for one call, then restores console. */
async function captureErrors(fn: () => Promise<unknown>): Promise<string> {
  const lines: string[] = [];
  const spy = mock.method(console, 'error', (...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
  try { await fn(); } finally { spy.mock.restore(); }
  return lines.join('\n');
}

function assertNoSecrets(log: string) {
  assert.equal(log.includes(SECRET_TOKEN), false, 'bot token leaked');
  assert.equal(log.includes('AAHsuperSecretBotTokenValue'), false, 'token fragment leaked');
  assert.equal(log.includes(SECRET_CHANNEL), false, 'channel id leaked');
  assert.equal(log.includes('9876543210'), false, 'channel id digits leaked');
  // The only permitted endpoint reference is the token-free template in the diagnostics line.
  const withoutTemplate = log.split('endpoint=api.telegram.org/bot<token>/createChatInviteLink').join('');
  assert.equal(/t\.me|telegram\.me|https?:\/\/|api\.telegram\.org/i.test(withoutTemplate), false, 'URL / invite leaked');
  assert.equal(/\/bot\d/.test(log), false, 'tokenized path leaked');
  assert.equal(log.includes('access-'), false, 'request body (invite name) leaked');
  assert.equal(log.includes('pay_1') || log.includes('NE-1') || log.includes('u1@'), false, 'payment/user data leaked');
}

test('HTTP 400: logs error_code and sanitized description; no token, channel id, URL or body', async () => {
  const hostile = {
    ok: false,
    error_code: 400,
    description:
      `Bad Request: chat not found\n[telegram] FORGED line chat_id=${SECRET_CHANNEL} ` +
      `token ${SECRET_TOKEN} see https://api.telegram.org/bot${SECRET_TOKEN}/x and https://t.me/+PrivInvite123`,
  };
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: SECRET_TOKEN, TELEGRAM_STANDARD_CHANNEL_ID: SECRET_CHANNEL, TELEGRAM_PRO_CHANNEL_ID: '-1001111111111' },
    () => new Response(JSON.stringify(hostile), { status: 400 })
  );
  let r: { ok: boolean } | undefined;
  const log = await captureErrors(async () => { r = await mod.issueChannelInvite(payment()); });
  mock.restoreAll();

  assert.equal(r?.ok, false);
  assert.match(log, /createChatInviteLink failed with HTTP 400 for standard/, 'existing status log kept');
  assert.match(log, /\| error_code: 400 \| description: Bad Request: chat not found/);
  assertNoSecrets(log);
  assert.equal(log.split('\n').filter((l) => l.startsWith('[telegram] FORGED')).length, 0, 'no forged log line');
});

test('HTTP 200 ok:false: rejected path logs the same sanitized detail', async () => {
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: SECRET_TOKEN, TELEGRAM_STANDARD_CHANNEL_ID: SECRET_CHANNEL, TELEGRAM_PRO_CHANNEL_ID: '-1001111111111' },
    () => new Response(JSON.stringify({ ok: false, error_code: 403, description: `Forbidden: bot is not a member of ${SECRET_CHANNEL}` }), { status: 200 })
  );
  const log = await captureErrors(() => mod.issueChannelInvite(payment()));
  mock.restoreAll();
  assert.match(log, /createChatInviteLink rejected for standard/);
  assert.match(log, /error_code: 403 \| description: Forbidden: bot is not a member of \[(redacted|id)\]/);
  assertNoSecrets(log);
});

test('non-JSON / empty error bodies are logged as unknown, never echoed raw', async () => {
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: SECRET_TOKEN, TELEGRAM_STANDARD_CHANNEL_ID: SECRET_CHANNEL, TELEGRAM_PRO_CHANNEL_ID: '-1001111111111' },
    () => new Response(`<html>${SECRET_TOKEN} https://t.me/+abcdefgh</html>`, { status: 502 })
  );
  const log = await captureErrors(() => mod.issueChannelInvite(payment()));
  mock.restoreAll();
  assert.match(log, /failed with HTTP 502 for standard/);
  assert.match(log, /error_code: null \| description: \(none\)/);
  assertNoSecrets(log);
});

test('telegramErrorSummary: shortens long descriptions and never throws', async () => {
  const { mod } = await load({});
  const long = mod.telegramErrorSummary({ error_code: 400, description: 'Bad Request: ' + 'x'.repeat(500) });
  assert.equal(long.errorCode, 400);
  assert.ok(long.description.length <= 161, String(long.description.length));
  for (const weird of [undefined, null, 42, 'not json', '{"error_code":"400"}', { description: 7 }]) {
    const out = mod.telegramErrorSummary(weird);
    assert.equal(typeof out.description, 'string');
  }
  assert.equal(mod.telegramErrorSummary('{"error_code":"400"}').errorCode, null, 'non-numeric code ignored');
  mock.restoreAll();
});

// ─── Request diagnostics on failure (fingerprints only) ─────────────────────

test('failure logs request diagnostics with fingerprints only — never the chat_id or token', async () => {
  const { createHash } = await import('node:crypto');
  const sha = (v: string) => createHash('sha256').update(v).digest('hex').slice(0, 10);
  const { mod } = await load(
    { TELEGRAM_BOT_TOKEN: SECRET_TOKEN, TELEGRAM_STANDARD_CHANNEL_ID: SECRET_CHANNEL, TELEGRAM_PRO_CHANNEL_ID: '-1001111111111' },
    () => new Response(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }), { status: 400 })
  );
  const log = await captureErrors(() => mod.issueChannelInvite(payment({ id: '9b2f4c1e-7a3d-4e8b-9c6f-2d1a0e5b7c93', order_id: 'NE-20261007-A1B2C3' })));
  mock.restoreAll();

  const line = log.split('\n').find((l) => l.includes('request diagnostics')) ?? '';
  assert.ok(line, 'diagnostics line is written on failure');
  for (const part of [
    'slug=standard', 'chat_id_type=string', `chat_id_sha256=${sha(SECRET_CHANNEL)}`, `chat_id_len=${SECRET_CHANNEL.length}`,
    'chat_id_format_ok=true', `token_sha256=${sha(SECRET_TOKEN)}`, `token_len=${SECRET_TOKEN.length}`,
    'token_outer_whitespace=false', 'invite_name_len=25', 'endpoint=api.telegram.org/bot<token>/createChatInviteLink',
  ]) assert.ok(line.includes(part), `missing ${part} in: ${line}`);

  // Never the real values, the tokenized URL or the request body.
  assert.equal(log.includes(SECRET_TOKEN), false, 'token leaked');
  assert.equal(log.includes(SECRET_TOKEN.split(':')[1]), false, 'token secret part leaked');
  assert.equal(log.includes(SECRET_CHANNEL), false, 'chat_id leaked');
  assert.equal(log.includes(SECRET_CHANNEL.replace('-', '')), false, 'chat_id digits leaked');
  assert.equal(/https?:\/\//.test(log), false, 'URL leaked');
  assert.equal(/member_limit|"name"|access-NE|NE-20261007|9b2f4c1e/.test(log), false, 'request body / payment data leaked');
});

test('diagnostics flag a malformed chat_id and a whitespace-padded token without revealing them', async () => {
  const { mod } = await load({});
  const out = mod.inviteRequestDiagnostics('pro', ' -100123 ', ` ${SECRET_TOKEN}\n`, 'access-x');
  assert.match(out, /chat_id_format_ok=false/);
  assert.match(out, /token_outer_whitespace=true/);
  assert.match(out, new RegExp(`token_len=${SECRET_TOKEN.length + 2} `), 'length of the raw, padded value');
  assert.equal(out.includes(SECRET_TOKEN), false);
  assert.equal(out.includes('-100123'), false);
  const num = mod.inviteRequestDiagnostics('pro', -1001234567890, SECRET_TOKEN, 'n');
  assert.match(num, /chat_id_type=number/);
  assert.equal(num.includes('1234567890'), false);
  mock.restoreAll();
});
