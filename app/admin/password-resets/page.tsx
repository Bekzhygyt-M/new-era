import { requireAdminPage } from '@/lib/permissions';
import { db } from '@/lib/db';
import AdminPasswordResetsClient from './AdminPasswordResetsClient';

export const dynamic = 'force-dynamic';

/** Admin-approved password recovery queue (TZ §9). */
export default async function AdminPasswordResetsPage() {
  await requireAdminPage();

  const requests = (await db.raw()).password_resets
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 100)
    // The token hash never reaches the browser.
    .map(({ token_hash: _hash, ...rest }) => ({
      ...rest,
      expired: Boolean(rest.expires_at && new Date(rest.expires_at).getTime() < Date.now()),
    }));

  return <AdminPasswordResetsClient initialRequests={requests} ttlMinutes={30} />;
}
