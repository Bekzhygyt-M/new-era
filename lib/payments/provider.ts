import type { LocalPayment } from '@/lib/local-db';
import { db } from '@/lib/db';

/**
 * Payment provider surface.
 *
 * NEW ERA settles payments manually: the student transfers the amount and
 * uploads a receipt, an admin approves it (TZ §19). There is no automated
 * card-processing integration, and this module deliberately does not pretend
 * otherwise — see /admin/settings → Payment Methods for what is advertised
 * as supported versus planned.
 */

export type PaymentProviderId = 'manual' | 'click' | 'payme' | 'uzumbank' | 'card';

export const MANUAL_PROVIDERS: { id: PaymentProviderId; label: string }[] = [
  { id: 'click', label: 'Click' },
  { id: 'payme', label: 'Payme' },
  { id: 'uzumbank', label: 'Uzum Bank' },
  { id: 'card', label: 'Bank kartasi' },
];

export function isValidProvider(id: string): id is PaymentProviderId {
  return ['manual', ...MANUAL_PROVIDERS.map((p) => p.id)].includes(id);
}

/**
 * Tells the admins a receipt is waiting (TZ §19, §21).
 *
 * The receipt is already stored before this runs, so a failure here can never
 * lose a payment — it only costs the admins a notification; the queue at
 * /admin/payments is the authority either way.
 */
export async function notifyPaymentSubmitted(payment: LocalPayment): Promise<boolean> {
  try {
    const admins = (await db.getProfiles()).filter((p) => p.role === 'admin');
    if (!admins.length) return false;

    const course = await db.getCourse(payment.course_id);
    const buyer = `${payment.first_name || ''} ${payment.last_name || ''}`.trim();

    await Promise.all(
      admins.map((admin) =>
        db.addNotification({
          user_id: admin.id,
          title: 'Yangi to‘lov cheki',
          message: `${payment.order_id} — ${buyer || 'foydalanuvchi'} "${course?.title || payment.course_id}" kursi uchun chek yubordi.`,
          type: 'payment',
          link: `/admin/payments/${payment.id}`,
        })
      )
    );
    return true;
  } catch (error) {
    console.error('[payments] admin notification failed:', error);
    return false;
  }
}
