import { db } from '@/lib/db';
import AdminSettingsClient from './AdminSettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await db.getSettings();

  return (
    <div>
      <AdminSettingsClient initialSettings={settings} />
    </div>
  );
}
