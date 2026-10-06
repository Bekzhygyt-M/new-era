import AdminNotificationsClient from './AdminNotificationsClient';
import { db } from '@/lib/db';
import { withoutNotificationInvite } from '@/lib/telegram/channel-access';
import { requireAdminPage } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  await requireAdminPage();

  // Real notification log (TZ §21, §31).
  const notifications = await Promise.all(
    (await db.raw()).notifications.slice(0, 100).map(async (n) => ({
      // Admin log: never show a buyer's single-member Telegram invite.
      ...withoutNotificationInvite(n),
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
