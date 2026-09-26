import { db } from '@/lib/db';
import AdminPaymentsClient from './AdminPaymentsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  // Pull guaranteed persistent payments from local storage engine
  const payments = await db.getPayments();

  return (
    <div>
      <AdminPaymentsClient initialPayments={payments} />
    </div>
  );
}
