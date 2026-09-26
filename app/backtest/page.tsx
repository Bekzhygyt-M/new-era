import Navbar from '@/components/navbar/Navbar';
import BacktestClient from './BacktestClient';
import { requireUserPage } from '@/lib/permissions';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Backtest workspace (TZ §18). */
export default async function BacktestPage() {
  const auth = await requireUserPage('/backtest');
  const backtests = await db.getBacktests(auth.profile.id);

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-24 sm:px-8">
        <BacktestClient initialBacktests={backtests} />
      </main>
    </div>
  );
}
