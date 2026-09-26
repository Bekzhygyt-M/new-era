import Link from 'next/link';
import UserSidebar from '@/components/dashboard/UserSidebar';
import UserHeader from '@/components/dashboard/UserHeader';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import { MessageCircle, Wrench, ChevronRight } from 'lucide-react';
import { getTranslations } from '@/lib/i18n/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Support hub (TZ §29). Every channel is in-app or email — no Telegram bot or
 * channel here, since the platform's own messaging replaces that (TZ request
 * to drop the Telegram dependency entirely).
 */
export default async function SupportPage() {
  const { t } = await getTranslations();
  const settings = await db.getSettings();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-white selection:bg-white selection:text-black">
      <UserSidebar activeTab="support" />

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#050505]">
        <UserHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] w-full mx-auto">
          {/* Header */}
          <div className="pb-4 border-b border-white/10">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">{t('support.title')}</h1>
            <p className="text-xs sm:text-sm text-white/50">{t('support.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/messages"
              className="bg-[#000000] border border-white/15 hover:border-white rounded-3xl p-6 shadow-2xl transition duration-200 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-white transition">{t('support.askTitle')}</h3>
                  <p className="text-xs text-white/50 mt-0.5 font-mono">{t('support.askDesc')}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white transition" />
            </Link>

            <a
              href={`mailto:${settings.support_email}`}
              className="bg-[#000000] border border-white/15 hover:border-white rounded-3xl p-6 shadow-2xl transition duration-200 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition">
                  <Wrench size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-white transition">{t('support.techTitle')}</h3>
                  <p className="text-xs text-white/50 mt-0.5 font-mono">{t('support.techDesc')}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white transition" />
            </a>
          </div>

          <DashboardFooter />
        </div>
      </main>
    </div>
  );
}
