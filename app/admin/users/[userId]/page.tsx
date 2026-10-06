import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { withoutInviteLink } from '@/lib/telegram/channel-access';
import { requireAdminPage } from '@/lib/permissions';
import AdminUserDetailClient from './AdminUserDetailClient';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdminPage();
  const { userId } = await params;

  // getProfile resolves by id or email. A miss is a 404 — never invent a user.
  const profile = await db.getProfile(userId);
  if (!profile) notFound();

  // Admin view: never embed a buyer's single-member invite link.
  const payments = (await db.getPayments(profile.id)).map(withoutInviteLink);
  const courses = await db.getCourses();

  return (
    <div>
      <AdminUserDetailClient
        initialProfile={profile}
        initialPayments={payments}
        courses={courses}
      />
    </div>
  );
}
