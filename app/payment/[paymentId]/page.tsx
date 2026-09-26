import { notFound } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import PaymentStatusClient from './PaymentStatusClient';
import { requireUserPage } from '@/lib/permissions';
import { db } from '@/lib/db';
import { remainingSeconds } from '@/lib/payments/service';

export const dynamic = 'force-dynamic';

/** Live order status (TZ §19). A user can only open their own payment. */
export default async function PaymentPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const auth = await requireUserPage(`/payment/${paymentId}`);

  const payment = await db.getPayment(paymentId);
  if (!payment) notFound();
  if (payment.user_id !== auth.profile.id && !auth.isAdmin) notFound();

  const course = await db.getCourse(payment.course_id);

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-2xl px-5 pb-20 pt-24 sm:px-8">
        <PaymentStatusClient
          paymentId={payment.id}
          orderId={payment.order_id}
          courseId={payment.course_id}
          courseTitle={course?.title || 'Kurs'}
          amount={payment.amount}
          currency={payment.currency}
          initialStatus={payment.status}
          initialRemaining={remainingSeconds(payment)}
          rejectionReason={payment.rejection_reason || null}
          submittedAt={payment.submitted_at || null}
        />
      </main>
    </div>
  );
}
