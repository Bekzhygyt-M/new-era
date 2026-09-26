import AdminNotificationsClient from './AdminNotificationsClient';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  await requireAdminPage();

  // Real notification log (TZ §21, §31).
  const notifications = await Promise.all(
    (await db.raw()).notifications.slice(0, 100).map(async (n) => ({
      ...n,
      recipient:
        n.user_id === 'all'
          ? 'Barcha talabalar'
          : (await db.getProfile(n.user_id))?.email || 'Foydalanuvchi',
    }))
  );


  return (
    <div className="space-y-8">
      <AdminNotificationsClient initialNotifications={notifications} />
    </div>
  );
}
