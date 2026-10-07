import { createHash } from 'node:crypto';
import { COURSE_IDS } from '@/lib/content/curriculum';
import type { LocalPayment } from '@/lib/local-db';

/**
 * Telegram private-channel access.
 *
 * SERVER-ONLY. This module reads the bot token and calls the Telegram Bot API,
 * so it must never be imported from a Client Component. Every caller is under
 * src/server or app/api, and the token is only read from process.env here.
 * (`server-only` is not imported because this file is also exercised by unit
 * tests, which run outside the Next bundler where that package resolves.)
 *
 * Grants access to the private channel that matches the product an admin
 * approved. Scope is deliberately narrow: we mint an invite link and hand it
 * to the eligible user. Membership duration, expiry enforcement and removal of
 * members are the client's responsibility and are NOT handled here.
 *
 * Invites are created with `member_limit: 1` so a shared link is much less
 * useful to a second person. No expiry is set, because the client has not
 * specified one — that is a business decision, not a technical default.
 *
 * A public channel link (t.me/username) is deliberately never used as a
 * fallback: a public link would silently grant access to anyone who saw it.
 */

export type TelegramChannelSlug = 'standard' | 'pro';

export type TelegramInviteResult =
  | { ok: true; inviteUrl: string; slug: TelegramChannelSlug; reused: boolean }
  | { ok: false; reason: TelegramFailureReason; message: string };

export type TelegramFailureReason =
  | 'not_configured'
  | 'unknown_product'
  | 'not_approved'
  | 'api_error';

/**
 * Maps the purchased product to its channel.
 *
 * Keyed on the course slug, resolved from the authoritative COURSE_IDS map in
 * lib/content/curriculum.ts — never on the payment amount, the billing period,
 * or any user-supplied label.
 */
const CHANNEL_BY_SLUG: Record<TelegramChannelSlug, string | undefined> = {
  standard: process.env.TELEGRAM_STANDARD_CHANNEL_ID,
  pro: process.env.TELEGRAM_PRO_CHANNEL_ID,
};

const DISPLAY_NAME: Record<TelegramChannelSlug, string> = {
  standard: 'Standard Trading',
  pro: 'Pro Trading',
};

/** True when both the bot token and this product's channel id are present. */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Resolves a course id to its product slug, or null if it is not a known product. */
export function slugForCourseId(courseId: string): TelegramChannelSlug | null {
  if (courseId === COURSE_IDS.standard) return 'standard';
  if (courseId === COURSE_IDS.pro) return 'pro';
  return null;
}

/** Human-readable channel name for UI copy and notifications. */
export function channelDisplayName(slug: TelegramChannelSlug): string {
  return DISPLAY_NAME[slug];
}

/**
 * Removes the buyer's invite link from a payment before it is shown to anyone
 * other than the buyer.
 *
 * Invites are single-member: if an admin (or anyone else) opened the link, the
 * buyer's seat would be used up. Admin payment views and API responses must
 * therefore never carry it. Returns a copy; the stored row is not touched.
 */
export function withoutInviteLink<T extends { telegram_invite_link?: string | null } | null | undefined>(payment: T): T {
  if (!payment || !('telegram_invite_link' in payment)) return payment;
  const copy = { ...payment };
  delete copy.telegram_invite_link;
  return copy;
}

/**
 * Hides the invite link carried by a Telegram-access notification when the
 * notification is shown to someone other than its recipient (the admin
 * notification log). Other notifications are returned unchanged.
 */
export function withoutNotificationInvite<T extends { type?: string; link?: string | null }>(notification: T): T {
  return notification.type === 'telegram_access' ? { ...notification, link: null } : notification;
}

/** Telegram rejects an invite link `name` longer than 32 characters. */
export const INVITE_NAME_MAX = 32;

/**
 * Deterministic, human-readable label shown to channel admins next to the
 * invite. Uses the order number (e.g. `NE-20261007-ABC123`); a raw payment
 * UUID would make `access-<uuid>` 43 characters, which Telegram refuses.
 * Always clipped to the API limit, whatever the stored ids look like.
 */
export function inviteLinkName(payment: Pick<LocalPayment, 'id' | 'order_id'>): string {
  const ref = (payment.order_id || payment.id || '').trim();
  return `access-${ref}`.slice(0, INVITE_NAME_MAX);
}

/** Longest Telegram error description kept in logs. */
const LOG_DESCRIPTION_MAX = 160;

/**
 * Diagnostic summary of a failed Bot API response, safe to write to logs.
 *
 * Keeps Telegram's numeric `error_code` and a shortened `description` (e.g.
 * "Bad Request: chat not found") — enough to tell permissions, chat id and
 * parameter problems apart. Everything that could identify or authorise
 * anything is removed first: the given secrets (bot token, channel id) are
 * replaced wherever they appear, then any URL, any t.me / telegram.me
 * reference, any "<digits>:<token>" pattern and any long number (chat / user
 * ids). Control characters are stripped so a crafted description cannot
 * forge extra log lines. Never throws.
 */
export function telegramErrorSummary(
  body: unknown,
  secrets: (string | null | undefined)[] = []
): { errorCode: number | null; description: string } {
  let parsed: unknown = body;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }
  }
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const errorCode = typeof obj.error_code === 'number' && Number.isFinite(obj.error_code) ? obj.error_code : null;
  let description = typeof obj.description === 'string' ? obj.description : '';

  for (const secret of secrets) {
    if (secret && secret.length >= 3) description = description.split(secret).join('[redacted]');
  }
  description = description
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
    .replace(/\b\d{5,}:[A-Za-z0-9_-]{10,}/g, '[redacted]') // bot token shape
    .replace(/(https?:\/\/|tg:\/\/)\S+/gi, '[url]')
    .replace(/\b(t|telegram)\.me\/\S*/gi, '[url]')
    .replace(/-?\d{5,}/g, '[id]') // chat, channel and user ids
    .replace(/\s+/g, ' ')
    .trim();
  if (description.length > LOG_DESCRIPTION_MAX) description = `${description.slice(0, LOG_DESCRIPTION_MAX)}…`;

  return { errorCode, description: description || '(none)' };
}

/** Host and path template of the invite call — never the tokenized URL. */
const INVITE_ENDPOINT = 'api.telegram.org/bot<token>/createChatInviteLink';

/** First 10 hex chars of SHA-256: comparable between environments, not reversible to the token. */
function fingerprint(value: unknown): string {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 10);
}

/**
 * DIAGNOSTIC: safe metadata about the request that just failed, so the values
 * the production server actually used can be compared with a local run
 * without ever revealing them. Contains only types, lengths, format checks
 * and truncated SHA-256 fingerprints — never the chat id, the token, the
 * tokenized URL or the request body.
 */
export function inviteRequestDiagnostics(
  slug: string,
  chatId: unknown,
  token: unknown,
  inviteName: string
): string {
  const chat = String(chatId);
  const tok = String(token);
  return [
    `slug=${slug}`,
    `chat_id_type=${typeof chatId}`,
    `chat_id_sha256=${fingerprint(chatId)}`,
    `chat_id_len=${chat.length}`,
    `chat_id_format_ok=${/^-100\d+$/.test(chat)}`,
    `token_sha256=${fingerprint(token)}`,
    `token_len=${tok.length}`,
    `token_outer_whitespace=${tok !== tok.trim()}`,
    `invite_name_len=${inviteName.length}`,
    `endpoint=${INVITE_ENDPOINT}`,
  ].join(' ');
}

type TelegramApiResponse = { ok?: boolean; result?: { invite_link?: string }; description?: string };

/**
 * Mints a single-use-style invite link for the product a payment bought.
 *
 * Returns a typed failure rather than throwing, so a Telegram outage can never
 * roll back or fail an otherwise successful payment approval.
 */
export async function issueChannelInvite(payment: LocalPayment): Promise<TelegramInviteResult> {
  // Defence in depth: only an already-approved payment may yield a link.
  if (payment.status !== 'approved') {
    return { ok: false, reason: 'not_approved', message: 'To‘lov hali tasdiqlanmagan' };
  }

  const slug = slugForCourseId(payment.course_id);
  if (!slug) {
    return { ok: false, reason: 'unknown_product', message: 'Kurs Telegram kanaliga bog‘lanmagan' };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = CHANNEL_BY_SLUG[slug];

  if (!token || !channelId) {
    // Deliberately vague: do not reveal which variable is missing.
    return { ok: false, reason: 'not_configured', message: 'Telegram kanaliga kirish sozlanmagan' };
  }

  const inviteName = inviteLinkName(payment);
  // DIAGNOSTIC: logged only on failure, see inviteRequestDiagnostics().
  const logRequestDiagnostics = () =>
    console.error('[telegram] createChatInviteLink request diagnostics |', inviteRequestDiagnostics(slug, channelId, token, inviteName));

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        // One member only, so a forwarded link cannot admit a second person.
        member_limit: 1,
        name: inviteName,
      }),
      cache: 'no-store',
    });

    // The bot token appears only in the request path; it is never logged.
    if (!res.ok) {
      console.error('[telegram] createChatInviteLink failed with HTTP', res.status, 'for', slug);
      const detail = telegramErrorSummary(await res.text().catch(() => ''), [token, channelId]);
      console.error('[telegram] createChatInviteLink error for', slug, '| error_code:', detail.errorCode, '| description:', detail.description);
      logRequestDiagnostics();
      return { ok: false, reason: 'api_error', message: 'Telegram bilan bog‘lanishda xatolik' };
    }

    const data = (await res.json()) as TelegramApiResponse;
    const inviteUrl = data.result?.invite_link;

    if (!data.ok || !inviteUrl) {
      // Only the sanitized summary is logged; the raw description can echo ids.
      console.error('[telegram] createChatInviteLink rejected for', slug);
      const detail = telegramErrorSummary(data, [token, channelId]);
      console.error('[telegram] createChatInviteLink error for', slug, '| error_code:', detail.errorCode, '| description:', detail.description);
      logRequestDiagnostics();
      return { ok: false, reason: 'api_error', message: 'Telegram havolasi yaratilmadi' };
    }

    return { ok: true, inviteUrl, slug, reused: false };
  } catch {
    console.error('[telegram] createChatInviteLink threw for', slug);
    logRequestDiagnostics();
    return { ok: false, reason: 'api_error', message: 'Telegram bilan bog‘lanishda xatolik' };
  }
}

/**
 * Revokes one previously issued invite for a product's channel.
 *
 * Used only by the explicit "my invite does not work" recovery path, so a
 * replaced link can never be used afterwards. Best-effort: a failure (already
 * revoked, already used, network) is reported as `false`, never thrown, and
 * never blocks issuing the replacement. Never logs the link or the token.
 */
export async function revokeChannelInvite(slug: TelegramChannelSlug, inviteUrl: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = CHANNEL_BY_SLUG[slug];
  if (!token || !channelId || !inviteUrl) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/revokeChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, invite_link: inviteUrl }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[telegram] revokeChatInviteLink failed with HTTP', res.status, 'for', slug);
      return false;
    }
    const data = (await res.json()) as { ok?: boolean };
    return Boolean(data.ok);
  } catch {
    console.error('[telegram] revokeChatInviteLink threw for', slug);
    return false;
  }
}

/** True when this product's channel is configured (token + its channel id). */
export function isChannelConfigured(slug: TelegramChannelSlug): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && CHANNEL_BY_SLUG[slug]);
}

/**
 * True for a URL that is safe to redirect a browser to as a Telegram invite:
 * https, host t.me / telegram.me, and a private-invite path (`/+…` or
 * `/joinchat/…`). Anything else — including a public `t.me/<username>` channel
 * link — is rejected, so a corrupted stored value can never become an open
 * redirect or a public-channel fallback.
 */
export function isSafeInviteUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 200) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.hostname !== 't.me' && url.hostname !== 'telegram.me') return false;
  if (url.username || url.password || url.port) return false;
  return /^\/(\+[A-Za-z0-9_-]{6,}|joinchat\/[A-Za-z0-9_-]{6,})\/?$/.test(url.pathname);
}