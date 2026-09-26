import { db } from '@/lib/db';
import AdminUsersClient from './AdminUsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await db.getProfiles();

  return (
    <div>
      <AdminUsersClient initialUsers={users} />
    </div>
  );
}
