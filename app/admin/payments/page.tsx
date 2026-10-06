import { db } from '@/lib/db';
import { withoutInviteLink } from '@/lib/telegram/channel-access';
import AdminPaymentsClient from './AdminPaymentsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  // Pull guaranteed persistent payments from local storage engine
  // Admin view: never embed a buyer's single-member invite link.
  const payments = (await db.getPayments()).map(withoutInviteLink);

  return (
    <div>
      <AdminPaymentsClient initialPayments={payments} />
    </div>
  );
}
