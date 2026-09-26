import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  XCircle,
  CreditCard,
  BookOpen,
  Sparkles,
  Award,
  MessageSquare,
  ChevronLeft,
} from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import { requireUserPage } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getTranslations } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

const ICONS: Record<string, { icon: typeof Bell; tone: string }> = {
  payment_approved: { icon: CheckCircle2, tone: 'text-emerald-400' },
  payment_rejected: { icon: XCircle, tone: 'text-red-400' },
  course_unlocked: { icon: BookOpen, tone: 'text-white' },
  test_passed: { icon: Sparkles, tone: 'text-emerald-400' },
  test_failed: { icon: XCircle, tone: 'text-amber-400' },
  module_completed: { icon: Award, tone: 'text-emerald-400' },
  certificate_ready: { icon: Award, tone: 'text-white' },
  support_reply: { icon: MessageSquare, tone: 'text-white' },
  welcome: { icon: Sparkles, tone: 'text-white' },
  announcement: { icon: Bell, tone: 'text-white' },
};

/** Notification centre (TZ §21). */
export default async function NotificationsPage() {
  const { t } = await getTranslations();
  const auth = await requireUserPage('/notifications');
  const notifications = await db.getNotifications(auth.profile.id);

  // Opening the page is the read receipt.
  await db.markNotificationRead(auth.profile.id);

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white"
        >
          <ChevronLeft size={13} /> {t('nav.cabinet')}
        </Link>

        <header className="mb-6 mt-3">
          <h1 className="text-2xl font-black tracking-tight">{t('dashboard.notificationsLink')}</h1>
          <p className="mt-1 text-[13px] text-white/45">
            {notifications.length
              ? t('dashboard.messageCount', { n: notifications.length })
              : t('dashboard.notificationsAppearHere')}
          </p>
        </header>

        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 px-6 py-16 text-center">
            <Bell size={24} className="mx-auto mb-3 text-white/25" />
            <p className="text-sm font-semibold text-white/55">{t('dashboard.noNotifications')}</p>
            <p className="mt-1.5 text-[13px] text-white/35">
              {t('dashboard.notificationsHint')}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {notifications.map((notification) => {
              const meta = ICONS[notification.type] || ICONS.announcement;
              const Icon = meta.icon;

              const body = (
                <div
                  className={`flex gap-3.5 rounded-2xl border p-4 transition ${
                    notification.read
                      ? 'border-white/[0.07] bg-white/[0.015]'
                      : 'border-white/20 bg-white/[0.04]'
                  } ${notification.link ? 'hover:border-white/35' : ''}`}
                >
                  <Icon size={18} className={`mt-0.5 shrink-0 ${meta.tone}`} />

                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[13.5px] font-bold text-white">{notification.title}</p>
                    <p className="text-[12.5px] leading-relaxed text-white/55">{notification.message}</p>
                    <p className="mt-2 font-mono text-[10.5px] text-white/25">
                      {new Date(notification.created_at).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                </div>
              );

              return (
                <li key={notification.id}>
                  {notification.link ? (
                    <Link href={notification.link} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
