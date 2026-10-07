import { db } from '@/lib/db';
import type { LocalPayment } from '@/lib/local-db';
import {
  channelDisplayName,
  isChannelConfigured,
  isSafeInviteUrl,
  isTelegramConfigured,
  issueChannelInvite,
  revokeChannelInvite,
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
  /** The buyer's own payment-status page. */
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
 * that is only ever resolved by the buyer's own click on "Darslarga o‘tish"
 * (GET /api/course-access/<courseId> → getCourseAccess → ensureChannelInvite).
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
      message: `"${course?.title || 'Kurs'}" kursi ochildi. Buyurtma: ${result.payment.order_id}. Kabinetdagi "Darslarga o‘tish" tugmasi orqali kursga kiring.`,
      type: 'payment_approved',
      // The dashboard is the single access point; its CTA runs the access flow.
      link: '/dashboard',
    });

    await db.logActivity(result.payment.user_id, 'payment_approved', {
      order_id: result.payment.order_id,
      course_id: result.payment.course_id,
      amount: result.payment.amount,
      approved_by: approvedBy,
    });

    // No Telegram call here. The single-member invite is minted only when the
    // buyer explicitly asks for access (dashboard → "Darslarga o‘tish" →
    // /api/course-access/<courseId>). Minting at approval would put a one-seat
    // link into a notification, where an admin, a stale tab or a link preview
    // could consume it before the buyer ever clicks.
  }

  return { ok: true, payment: result.payment };
}

/** Caches the invite on the payment row so repeat clicks reuse one link. */
async function persistInvite(payment: LocalPayment, inviteUrl: string | null): Promise<void> {
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
 * Without this, two overlapping requests for the same payment (double click,
 * two open tabs) both see "no cached link" and each mint a separate
 * single-member invite. Concurrent callers in this process share one Telegram
 * call and one persisted link.
 */
const inviteInFlight = new Map<string, Promise<ChannelAccess>>();

/**
 * Returns the buyer's Telegram channel access for an APPROVED payment,
 * minting the invite on first call and reusing the persisted link afterwards.
 *
 * Works for payments approved before this feature existed: the first explicit
 * access request lazily creates and persists the invite.
 *
 * `options.replace` is the stale-link recovery path: when the buyer reports
 * that the saved link no longer works (already used, revoked, or deleted in
 * Telegram), the old link is revoked and exactly one new one is issued and
 * persisted. A stored value that is not a safe private-invite URL is treated
 * the same way, so a corrupted row can never become a redirect target.
 *
 * Idempotent: sequential calls reuse the persisted link; concurrent calls —
 * including concurrent `replace` calls — share one in-flight operation.
 * Returns null when Telegram is not configured, the product has no channel,
 * the payment is not approved, or Telegram fails; the next request retries.
 */
export async function ensureChannelInvite(
  payment: LocalPayment,
  options: { replace?: boolean } = {}
): Promise<ChannelAccess> {
  if (payment.status !== 'approved') return null;
  if (!isTelegramConfigured()) return null;

  const slug = slugForCourseId(payment.course_id);
  if (!slug) return null;

  const access = (inviteUrl: string): ChannelAccess => ({
    slug,
    channelName: channelDisplayName(slug),
    inviteUrl,
  });

  if (!options.replace && isSafeInviteUrl(payment.telegram_invite_link)) {
    return access(payment.telegram_invite_link);
  }

  const pending = inviteInFlight.get(payment.id);
  if (pending) return pending;

  const task = (async (): Promise<ChannelAccess> => {
    // The caller's row may be stale: another request can have minted and
    // persisted (or replaced) the link after this one read the payment.
    const fresh = await db.getPayment(payment.id).catch(() => null);
    const stored = fresh?.telegram_invite_link ?? payment.telegram_invite_link ?? null;
    const storedIsSafe = isSafeInviteUrl(stored);

    if (!options.replace && storedIsSafe) {
      payment.telegram_invite_link = stored;
      return access(stored);
    }
    // A replace racing a fresh mint: if another request already swapped the
    // link while this one waited, hand back that new link instead of rotating
    // a second time.
    if (options.replace && storedIsSafe && stored !== payment.telegram_invite_link) {
      payment.telegram_invite_link = stored;
      return access(stored);
    }

    const invite = await issueChannelInvite(payment);
    if (!invite.ok) return null;

    await persistInvite(payment, invite.inviteUrl);
    // Retire the old link only after the new one is safely stored, so a
    // Telegram hiccup never leaves the buyer with no working link at all.
    if (stored && storedIsSafe && stored !== invite.inviteUrl) {
      await revokeChannelInvite(slug, stored);
    }
    return access(invite.inviteUrl);
  })().finally(() => inviteInFlight.delete(payment.id));

  inviteInFlight.set(payment.id, task);
  return task;
}

// ─── Centralised course access ──────────────────────────────────────────────

/** How a course's paid content is delivered. */
export type CourseDelivery = 'telegram' | 'web';

/**
 * Every course with a configured private Telegram channel is delivered there;
 * anything else keeps the in-app lesson pages. Decided from the course id via
 * the authoritative COURSE_IDS mapping — never from price, period or a label.
 */
export function courseDelivery(courseId: string): CourseDelivery {
  return slugForCourseId(courseId) ? 'telegram' : 'web';
}

/** Where a course's "Darslarga o‘tish" button points, for page rendering. */
export interface CourseAccessLink {
  delivery: CourseDelivery;
  /** Same-origin URL only — never an invite. */
  href: string;
  /** False when the course is Telegram-delivered but its channel is not configured. */
  available: boolean;
}

/**
 * Pure and synchronous: decides the CTA target from the course id and the
 * server's Telegram configuration. It never reads the database and never calls
 * Telegram, so rendering the dashboard or "Kurslarim" can never create an
 * invite. The actual eligibility check and the invite happen only when the
 * buyer clicks (GET /api/course-access/<courseId> → getCourseAccess).
 */
export function courseAccessLink(courseId: string): CourseAccessLink {
  const slug = slugForCourseId(courseId);
  if (!slug) return { delivery: 'web', href: `/course/${courseId}`, available: true };
  return { delivery: 'telegram', href: `/api/course-access/${courseId}`, available: isChannelConfigured(slug) };
}

export type CourseAccessDenied =
  | 'no_access' // no active enrollment for this user + course
  | 'expired' // enrollment exists but its access window has ended
  | 'no_payment' // enrolled (e.g. admin grant) but no approved payment to attach an invite to
  | 'not_configured' // Telegram delivery, but the bot/channel is not configured
  | 'telegram_error'; // Telegram API failed — retryable

export type CourseAccessDecision =
  | { ok: true; delivery: 'web'; href: string }
  | { ok: true; delivery: 'telegram'; href: string; slug: TelegramChannelSlug; channelName: string }
  | { ok: false; reason: CourseAccessDenied; delivery: CourseDelivery; courseId: string };

/**
 * The ONE place that turns "this user wants to open this course" into a
 * destination. Dashboard, "Kurslarim" and the access route all go through it.
 *
 * Read-only unless `mint` is true: rendering a page asks `mint: false` (pure
 * eligibility, never calls Telegram); only the explicit click route passes
 * `mint: true`, which may create or reuse the invite.
 *
 * Ownership is enforced by construction: the caller passes the verified
 * session user id, and every lookup here is scoped to that user — a course id
 * or payment id from the URL can only ever select among the caller's own rows.
 */
export async function getCourseAccess(
  userId: string,
  courseId: string,
  options: { mint?: boolean; replace?: boolean } = {}
): Promise<CourseAccessDecision> {
  const delivery = courseDelivery(courseId);
  const deny = (reason: CourseAccessDenied): CourseAccessDecision => ({ ok: false, reason, delivery, courseId });

  if (!userId || !courseId) return deny('no_access');

  // Same expiry rule the rest of the app uses (both drivers implement it).
  // The buyer's payments are only needed when an invite may be issued; read
  // them in the same round trip as the enrollment check.
  const needsPayment = delivery === 'telegram' && Boolean(options.mint);
  const [active, payments] = await Promise.all([
    db.hasEnrollment(userId, courseId),
    needsPayment ? db.getPayments(userId) : Promise.resolve([] as LocalPayment[]),
  ]);
  if (!active) {
    // The local driver relabels a lapsed enrollment 'expired' on read; the
    // Supabase driver keeps 'active' with a past expires_at. Either way the
    // user did own the course, so tell them it expired rather than "no access".
    const enrollment = (await db.getEnrollments(userId)).find(
      (e) => e.course_id === courseId && (e.status === 'active' || e.status === 'expired')
    );
    return deny(enrollment ? 'expired' : 'no_access');
  }

  if (delivery === 'web') return { ok: true, delivery: 'web', href: `/course/${courseId}` };

  const slug = slugForCourseId(courseId)!;
  const channelName = channelDisplayName(slug);
  if (!isChannelConfigured(slug)) return deny('not_configured');

  // Eligibility-only (page render): never touches Telegram.
  if (!options.mint) {
    return { ok: true, delivery: 'telegram', href: courseAccessLink(courseId).href, slug, channelName };
  }

  // THIS user's approved payments for THIS course, newest first (both drivers
  // sort by created_at desc). Prefer one that already carries a usable invite,
  // so a renewal never mints a second seat for a buyer who already has one;
  // otherwise the newest approved payment receives the invite.
  const approved = payments.filter(
    (p) => p.user_id === userId && p.course_id === courseId && p.status === 'approved'
  );
  const payment = approved.find((p) => isSafeInviteUrl(p.telegram_invite_link)) ?? approved[0];
  if (!payment) return deny('no_payment');

  const invite = await ensureChannelInvite(payment, { replace: options.replace });
  if (!invite) return deny('telegram_error');

  return { ok: true, delivery: 'telegram', href: invite.inviteUrl, slug, channelName };
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
