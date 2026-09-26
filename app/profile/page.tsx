import Link from 'next/link';
import { ChevronLeft, Award, Mail, Phone, Calendar } from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import ProfileForm from './ProfileForm';
import { requireUserPage } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getOverallProgress } from '@/lib/learning';
import { getTranslations } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/** Profile (TZ §24). */
export default async function ProfilePage() {
  const { t } = await getTranslations();
  const auth = await requireUserPage('/profile');
  const { profile } = auth;

  const overall = await getOverallProgress(profile.id);
  const certificates = (await db.getCertificates(profile.id)).filter((c) => !c.revoked);
  const xpHistory = (await db.getXpTransactions(profile.id)).slice(0, 8);

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

        <header className="mb-6 mt-3 flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-xl font-black text-white">
            {profile.full_name.slice(0, 2).toUpperCase()}
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
              {profile.full_name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/45">
              <span className="rounded-full border border-white/12 px-2.5 py-0.5 font-bold text-white/70">
                {profile.level}
              </span>
              <span className="font-mono">{profile.xp} XP</span>
            </p>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: t('profile.coursesStat'), value: String(overall.courses.length) },
            { label: t('profile.completedLessonsStat'), value: `${overall.completedLessons}/${overall.totalLessons}` },
            { label: t('profile.certificatesStat'), value: String(certificates.length) },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="font-mono text-xl font-black text-white">{card.value}</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                {card.label}
              </div>
            </div>
          ))}
        </section>

        <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 text-[11px] font-black uppercase tracking-wider text-white/50">
            {t('profile.accountInfo')}
          </h2>

          <dl className="mb-5 space-y-2.5 text-[13px]">
            <div className="flex items-center gap-2.5">
              <Mail size={14} className="shrink-0 text-white/30" />
              <dt className="sr-only">Email</dt>
              <dd className="text-white/70">{profile.email}</dd>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="shrink-0 text-white/30" />
                <dt className="sr-only">{t('profile.phone')}</dt>
                <dd className="text-white/70">{profile.phone}</dd>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="shrink-0 text-white/30" />
              <dt className="sr-only">{t('profile.registeredOn')}</dt>
              <dd className="text-white/70">
                {new Date(profile.created_at).toLocaleDateString('uz-UZ')}
              </dd>
            </div>
          </dl>

          <ProfileForm
            initialName={profile.full_name}
            initialPhone={profile.phone || ''}
          />
        </section>

        {certificates.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-wider text-white/50">
              {t('profile.certificates')}
            </h2>
            <ul className="space-y-2">
              {certificates.map((certificate) => (
                <li key={certificate.id}>
                  <Link
                    href={`/certificate/${certificate.certificate_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5 transition hover:border-white/25"
                  >
                    <Award size={15} className="shrink-0 text-white/60" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold text-white">
                        {certificate.course_title}
                      </span>
                      <span className="block truncate font-mono text-[10.5px] text-white/35">
                        {certificate.certificate_id}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {xpHistory.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-wider text-white/50">
              {t('profile.xpHistory')}
            </h2>
            <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              {xpHistory.map((transaction) => (
                <li key={transaction.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/65">
                    {transaction.reason}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] font-bold text-white">
                    +{transaction.amount}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
