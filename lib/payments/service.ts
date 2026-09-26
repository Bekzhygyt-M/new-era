import { db } from '@/lib/db';
import type { LocalPayment } from '@/lib/local-db';

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

export async function approvePayment(orderIdOrId: string, approvedBy: string): Promise<TransitionResult> {
  const existing = await db.getPayment(orderIdOrId);
  if (!existing) return { ok: false, error: 'To‘lov topilmadi' };
  if (existing.status === 'approved') return { ok: true, payment: existing };
  if (existing.status === 'cancelled') return { ok: false, error: 'To‘lov bekor qilingan' };

  const payment = await db.approvePayment(orderIdOrId, approvedBy);
  if (!payment) return { ok: false, error: 'To‘lovni tasdiqlab bo‘lmadi' };

  const course = await db.getCourse(payment.course_id);

  await db.addNotification({
    user_id: payment.user_id,
    title: 'To‘lov tasdiqlandi ✅',
    message: `"${course?.title || 'Kurs'}" kursi ochildi. Buyurtma: ${payment.order_id}. Darslarni boshlashingiz mumkin!`,
    type: 'payment_approved',
    link: `/course/${payment.course_id}`,
  });

  await db.logActivity(payment.user_id, 'payment_approved', {
    order_id: payment.order_id,
    course_id: payment.course_id,
    amount: payment.amount,
    approved_by: approvedBy,
  });

  return { ok: true, payment };
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
