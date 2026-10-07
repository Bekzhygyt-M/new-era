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

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        // One member only, so a forwarded link cannot admit a second person.
        member_limit: 1,
        name: `access-${payment.id}`.slice(0, 64),
      }),
      cache: 'no-store',
    });

    // The bot token appears only in the request path; it is never logged.
    if (!res.ok) {
      console.error('[telegram] createChatInviteLink failed with HTTP', res.status, 'for', slug);
      return { ok: false, reason: 'api_error', message: 'Telegram bilan bog‘lanishda xatolik' };
    }

    const data = (await res.json()) as TelegramApiResponse;
    const inviteUrl = data.result?.invite_link;

    if (!data.ok || !inviteUrl) {
      // Never log data.description verbatim beyond the shape; it can echo ids.
      console.error('[telegram] createChatInviteLink rejected for', slug);
      return { ok: false, reason: 'api_error', message: 'Telegram havolasi yaratilmadi' };
    }

    return { ok: true, inviteUrl, slug, reused: false };
  } catch {
    console.error('[telegram] createChatInviteLink threw for', slug);
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