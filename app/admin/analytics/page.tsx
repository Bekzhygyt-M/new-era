import { db } from '@/lib/db';
import { withoutInviteLink } from '@/lib/telegram/channel-access';
import { requireAdminPage } from '@/lib/permissions';
import AdminAnalyticsClient from './AdminAnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  await requireAdminPage();

  // TZ §31 — every figure is computed from stored records, never sampled.
  const profiles = await db.getProfiles();
  // Admin view: never embed a buyer's single-member invite link.
  const payments = (await db.getPayments()).map(withoutInviteLink);
  const progress = (await db.raw()).lesson_progress;
  const testAttempts = await db.getAllAttempts();

  return (
    <div className="space-y-8">
      <AdminAnalyticsClient
        profiles={profiles}
        payments={payments}
        progress={progress}
        testAttempts={testAttempts}
      />
    </div>
  );
}
