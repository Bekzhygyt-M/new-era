import Navbar from '@/components/navbar/Navbar';
import JournalClient from './JournalClient';
import { requireUserPage } from '@/lib/permissions';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Trading Journal (TZ §17). Entries belong to one user and never leak. */
export default async function JournalPage() {
  const auth = await requireUserPage('/journal');
  const trades = await db.getJournal(auth.profile.id);

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-24 sm:px-8">
        <JournalClient initialTrades={trades} />
      </main>
    </div>
  );
}
