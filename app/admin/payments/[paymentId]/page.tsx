import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';
import AdminPaymentsClient from '../AdminPaymentsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentDetailPage({ params }: { params: Promise<{ paymentId: string }> }) {
  await requireAdminPage();
  const { paymentId } = await params;

  // Resolves by internal id or by the NE-YYYYMMDD-XXXXXX order id (TZ §19).
  const payment = await db.getPayment(paymentId);
  if (!payment) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/payments"
        className="text-white/50 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition"
      >
        <ChevronLeft size={16} /> Barcha to&apos;lovlar ro&apos;yxatiga qaytish
      </Link>

      <AdminPaymentsClient initialPayments={[payment]} />
    </div>
  );
}
