/**
 * Access-control and idempotency checks for the payment status endpoint that
 * delivers Telegram access.
 *
 * Fully static + isolated: reads the route source and asserts the ownership
 * gate precedes the invite resolution. No HTTP server, no database, no Telegram
 * calls.
 *
 * Run:  npx tsx --test tests/telegram-access-control.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/payment/status/route.ts', 'utf8');
const service = fs.readFileSync('lib/payments/service.ts', 'utf8');
const client = fs.readFileSync('app/payment/[paymentId]/PaymentStatusClient.tsx', 'utf8');

test('status route is authenticated', () => {
  assert.match(route, /requireUserApi\(\)/, 'must require a signed-in user');
});

test('ownership check happens BEFORE channel invite is resolved', () => {
  const guard = route.indexOf('payment.user_id !== auth.profile.id');
  const invite = route.indexOf('ensureChannelInvite(payment)');
  assert.ok(guard > -1, 'ownership guard must exist');
  assert.ok(invite > -1, 'invite must be resolved');
  assert.ok(guard < invite, 'ownership must be checked before minting/returning an invite');
});

test('a non-owner is rejected with 403', () => {
  assert.match(route, /Ruxsat berilmagan'\s*,\s*403/);
});

test('expired payments are marked expired before invite resolution', () => {
  const exp = route.indexOf('isExpired(payment)');
  const invite = route.indexOf('ensureChannelInvite(payment)');
  assert.ok(exp > -1 && exp < invite, 'expiry check must precede invite resolution');
});

test('ensureChannelInvite refuses anything not approved', () => {
  const fn = service.slice(service.indexOf('export async function ensureChannelInvite'));
  assert.match(fn, /if \(payment\.status !== 'approved'\) return null;/);
});

test('ensureChannelInvite refuses when Telegram is unconfigured', () => {
  const fn = service.slice(service.indexOf('export async function ensureChannelInvite'));
  assert.match(fn, /if \(!isTelegramConfigured\(\)\) return null;/);
});

test('ensureChannelInvite reuses a cached link instead of minting again', () => {
  const fn = service.slice(service.indexOf('export async function ensureChannelInvite'));
  const cached = fn.indexOf('if (payment.telegram_invite_link)');
  const mint = fn.indexOf('issueChannelInvite(payment)');
  assert.ok(cached > -1 && cached < mint, 'cached link must short-circuit before a new mint');
});

test('issueChannelInvite also refuses unapproved payments (defence in depth)', () => {
  const tg = fs.readFileSync('lib/telegram/channel-access.ts', 'utf8');
  assert.match(tg, /if \(payment\.status !== 'approved'\)/);
});

test('approval hook is inside the fresh-transition guard only', () => {
  const fresh = service.indexOf('if (!result.was_already_approved && existing.status !== \'approved\')');
  const invite = service.indexOf('ensureChannelInvite(result.payment)');
  const endOfBlock = service.indexOf('return { ok: true, payment: result.payment };');
  assert.ok(fresh > -1, 'fresh-transition guard must exist');
  assert.ok(invite > fresh, 'invite must be issued after the guard');
  assert.ok(invite < endOfBlock, 'invite must be inside the guarded block');
});

test('Telegram failure cannot fail the payment approval', () => {
  // Access is only acted on when present; no throw path escapes. The runtime
  // behaviour is exercised in tests/telegram-service.test.ts.
  const start = service.indexOf('const access = await ensureChannelInvite(result.payment)');
  const end = service.indexOf('return { ok: true, payment: result.payment };');
  assert.ok(start > -1 && end > start);
  const block = service.slice(start, end);
  assert.match(block, /if \(access\)/);
  assert.equal(/throw new Error/.test(block), false, 'must not throw on Telegram failure');
});

test('invite is persisted best-effort and never breaks approval', () => {
  const fn = service.slice(service.indexOf('async function persistInvite'));
  assert.match(fn, /try\s*{/);
  assert.match(fn, /catch/);
});

test('UI shows the channel only when approved AND a link exists', () => {
  assert.match(client, /status === 'approved' && telegram/);
});

test('UI never renders a fallback or hardcoded t.me link', () => {
  assert.equal(/href=["']https:\/\/t\.me\//.test(client), false, 'no hardcoded public link');
});

test('UI labels differ per product', () => {
  assert.match(client, /Pro Trading kanaliga qo‘shilish/);
  assert.match(client, /Standard Trading kanaliga qo‘shilish/);
});

test('UI opens the invite safely', () => {
  assert.match(client, /rel="noopener noreferrer"/);
  assert.match(client, /target="_blank"/);
});