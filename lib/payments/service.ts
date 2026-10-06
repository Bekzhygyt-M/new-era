import { db } from '@/lib/db';
import type { LocalPayment } from '@/lib/local-db';
import {
  channelDisplayName,
  isTelegramConfigured,
  issueChannelInvite,
  slugForCourseId,
  type TelegramChannelSlug,
} from '@/lib/telegram/channel-access';

/**
 * Payment state transitions.
 *
 * Every approval path funnels through here, so approval,
 * rejection and expiry behave identically no matter where they are triggered.
 */

export interface TransitionResult {
  ok: boolean;
  error?: string;
  payment?: LocalPayment;
}

/** Server-side expiry check — never trust a countdown rendered in the browser. */
export function isExpired(payment: LocalPayment): boolean {
  if (!payment.expires_at) return false;
  if (payment.status === 'approved' || payment.status === 'receipt_submitted') return false;
  return new Date(payment.expires_at).getTime() < Date.now();
}

export function remainingSeconds(payment: LocalPayment): number {
  if (!payment.expires_at) return 0;
  return Math.max(0, Math.floor((new Date(payment.expires_at).getTime() - Date.now()) / 1000));
}

/** One row of the buyer's own order list ("Kurslarim" → "Buyurtmalarim"). */
export interface BuyerOrder {
  id: string;
  orderId: string;
  courseId: string;
  courseTitle: string | null;
  status: LocalPayment['status'];
  amount: number;
  currency: string;
  createdAt: string;
  /** The buyer's own status / Telegram-access page. */
  href: string;
}

/**
 * The signed-in buyer's own orders, newest first.
 *
 * Scoped by the caller's verified profile id at the query itself
 * (`db.getPayments(userId)`), so it can never return another user's payment.
 * Read-only: an overdue unpaid order is *shown* as expired, but nothing is
 * written here. Only a still-open `pending` order can display as expired — a
 * rejected, cancelled or approved order keeps its own status even after its
 * payment window has passed. Deliberately omits the Telegram invite link —
 * that is only ever resolved on the payment page, for its buyer, by
 * ensureChannelInvite().
 */
export async function listBuyerOrders(userId: string): Promise<BuyerOrder[]> {
  if (!userId) return [];
  const payments = await db.getPayments(userId);
  return payments
    .filter((p) => p.user_id === userId)
    .map((p) => ({
      id: p.id,
      orderId: p.order_id,
      courseId: p.course_id,
      courseTitle: p.courses?.title ?? null,
      status: p.status === 'pending' && isExpired(p) ? 'expired' : p.status,
      amount: p.amount,
      currency: p.currency,
      createdAt: p.created_at,
      href: `/payment/${encodeURIComponent(p.id)}`,
    }));
}

type PlanPeriod = 'daily' | 'monthly' | 'yearly';

function getPaymentPeriod(payment: LocalPayment): PlanPeriod | undefined {
  const period = (payment as unknown as Record<string, unknown>).period;
  if (period === 'daily' || period === 'monthly' || period === 'yearly') {
    return period;
  }
  return undefined;
}

export async function approvePayment(orderIdOrId: string, approvedBy: string): Promise<TransitionResult> {
  const existing = await db.getPayment(orderIdOrId);
  if (!existing) return { ok: false, error: 'To‘lov topilmadi' };
  if (existing.status === 'cancelled') return { ok: false, error: 'To‘lov bekor qilingan' };

  const period = getPaymentPeriod(existing);

  const result = await db.approvePaymentAndEnroll(existing.id, approvedBy, period);
  if (!result.ok || !result.payment) {
    return { ok: false, error: result.error || 'To‘lovni tasdiqlab bo‘lmadi' };
  }

  // Create notification and log activity only on fresh transition (not on retries)
  if (!result.was_already_approved && existing.status !== 'approved') {
    const course = await db.getCourse(result.payment.course_id);

    await db.addNotification({
      user_id: result.payment.user_id,
      title: 'To‘lov tasdiqlandi ✅',
      message: `"${course?.title || 'Kurs'}" kursi ochildi. Buyurtma: ${result.payment.order_id}. Darslarni boshlashingiz mumkin!`,
      type: 'payment_approved',
      link: `/course/${result.payment.course_id}`,
    });

    await db.logActivity(result.payment.user_id, 'payment_approved', {
      order_id: result.payment.order_id,
      course_id: result.payment.course_id,
      amount: result.payment.amount,
      approved_by: approvedBy,
    });

    // Telegram access is best-effort and never gates the approval: the payment
    // is already approved and enrolled at this point. Routed through the same
    // single-flight path as the status page, so an approval racing the buyer's
    // first page load still yields ONE invite, and the notification carries the
    // exact link that was persisted. If minting fails now, the buyer obtains it
    // later from the payment page via ensureChannelInvite().
    const access = await ensureChannelInvite(result.payment);
    if (access) {
      await db.addNotification({
        user_id: result.payment.user_id,
        title: `${access.channelName} Telegram kanali`,
        message: `“${access.channelName}” yopiq kanaliga qo‘shilish havolasi tayyor. Havola bitta kishiga mo‘ljallangan — uni boshqa kishaga yubormang.`,
        type: 'telegram_access',
        link: access.inviteUrl,
      });
    }
  }

  return { ok: true, payment: result.payment };
}

/** Caches the invite on the payment row so repeat polls reuse one link. */
async function persistInvite(payment: LocalPayment, inviteUrl: string): Promise<void> {
  try {
    payment.telegram_invite_link = inviteUrl;
    await db.savePayment({ id: payment.id, telegram_invite_link: inviteUrl });
  } catch {
    // A missing column must not break an approved payment; the link is
    // simply re-minted on the next request.
    console.error('[telegram] could not cache invite for payment', payment.id);
  }
}

export type ChannelAccess = {
  slug: TelegramChannelSlug;
  channelName: string;
  inviteUrl: string;
} | null;

/**
 * In-flight invite creation, keyed by payment id.
 *
 * Without this, two overlapping requests for the same payment (approval racing
 * the status poll, two open tabs) both see "no cached link" and each mint a
 * separate single-member invite. Concurrent callers in this process now share
 * one Telegram call and one persisted link.
 */
const inviteInFlight = new Map<string, Promise<ChannelAccess>>();

/**
 * Returns the user's Telegram channel access for an APPROVED payment, minting
 * the invite on first call and reusing the cached link afterwards.
 *
 * Works for payments approved before this feature existed: their first status
 * request lazily creates and persists the invite.
 *
 * Idempotent: sequential calls reuse the persisted link; concurrent calls share
 * one in-flight creation. Returns null when Telegram is not configured, the
 * product has no channel, the payment is not approved, or Telegram fails — the
 * caller then shows the normal payment state and the next request retries.
 */
export async function ensureChannelInvite(payment: LocalPayment): Promise<ChannelAccess> {
  if (payment.status !== 'approved') return null;
  if (!isTelegramConfigured()) return null;

  const slug = slugForCourseId(payment.course_id);
  if (!slug) return null;

  const access = (inviteUrl: string): ChannelAccess => ({
    slug,
    channelName: channelDisplayName(slug),
    inviteUrl,
  });

  if (payment.telegram_invite_link) return access(payment.telegram_invite_link);

  const pending = inviteInFlight.get(payment.id);
  if (pending) return pending;

  const task = (async (): Promise<ChannelAccess> => {
    // The caller's row may be stale: another request can have minted and
    // persisted the link after this one read the payment. Re-read first.
    const fresh = await db.getPayment(payment.id).catch(() => null);
    if (fresh?.telegram_invite_link) {
      payment.telegram_invite_link = fresh.telegram_invite_link;
      return access(fresh.telegram_invite_link);
    }

    const invite = await issueChannelInvite(payment);
    if (!invite.ok) return null;

    await persistInvite(payment, invite.inviteUrl);
    return access(invite.inviteUrl);
  })().finally(() => inviteInFlight.delete(payment.id));

  inviteInFlight.set(payment.id, task);
  return task;
}

export async function rejectPayment(orderIdOrId: string, reason: string, rejectedBy: string): Promise<TransitionResult> {
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: 'Rad etish sababini yozing' };

  const existing = await db.getPayment(orderIdOrId);
  if (!existing) return { ok: false, error: 'To‘lov topilmadi' };
  if (existing.status === 'approved') return { ok: false, error: 'Tasdiqlangan to‘lovni rad etib bo‘lmaydi' };

  const payment = await db.rejectPayment(orderIdOrId, trimmed, rejectedBy);
  if (!payment) return { ok: false, error: 'To‘lovni rad etib bo‘lmadi' };

  const course = await db.getCourse(payment.course_id);

  await db.addNotification({
    user_id: payment.user_id,
    title: 'To‘lov rad etildi ❌',
    message: `"${course?.title || 'Kurs'}" uchun to‘lov rad etildi. Sabab: ${trimmed}. Buyurtma: ${payment.order_id}.`,
    type: 'payment_rejected',
    link: `/payment/${payment.id}`,
  });

  await db.logActivity(payment.user_id, 'payment_rejected', {
    order_id: payment.order_id,
    reason: trimmed,
    rejected_by: rejectedBy,
  });

  return { ok: true, payment };
}

export async function cancelPayment(orderIdOrId: string, userId: string): Promise<TransitionResult> {
  const existing = await db.getPayment(orderIdOrId);
  if (!existing) return { ok: false, error: 'To‘lov topilmadi' };
  if (existing.user_id !== userId) return { ok: false, error: 'Ruxsat berilmagan' };
  if (existing.status === 'approved') return { ok: false, error: 'Tasdiqlangan to‘lovni bekor qilib bo‘lmaydi' };

  const payment = await db.cancelPayment(orderIdOrId);
  if (!payment) return { ok: false, error: 'To‘lovni bekor qilib bo‘lmadi' };

  await db.logActivity(userId, 'payment_cancelled', { order_id: payment.order_id });
  return { ok: true, payment };
}

export function formatAmount(amount: number, currency = 'UZS'): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} ${currency}`;
}
