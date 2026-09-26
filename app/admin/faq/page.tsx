import AdminFAQClient from './AdminFAQClient';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminFAQPage() {
  await requireAdminPage();

  // Real FAQ rows, including unpublished ones (TZ §22).
  const faqs = await db.getFaqs();


  return (
    <div className="space-y-8">
      <AdminFAQClient initialItems={faqs} />
    </div>
  );
}
