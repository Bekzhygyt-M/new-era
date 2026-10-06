import Link from 'next/link';
import {
  PlayCircle,
  ArrowRight,
  BookOpen,
  Receipt,
  Clock,
  Hourglass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { db } from '@/lib/db';
import { requireUserPage } from '@/lib/permissions';
import { getTranslations } from '@/lib/i18n/server';
import { localizeCourses } from '@/lib/content/localize';
import { formatAmount, listBuyerOrders, type BuyerOrder } from '@/lib/payments/service';

export const dynamic = 'force-dynamic';

/** Same palette as the payment status page, so a status reads the same everywhere. */
const ORDER_STATUS_UI: Record<BuyerOrder['status'], { tone: string; icon: typeof Clock }> = {
  pending: { tone: 'text-white border-white/20 bg-white/5', icon: Clock },
  receipt_submitted: { tone: 'text-amber-300 border-amber-300/25 bg-amber-300/[0.06]', icon: Hourglass },
  approved: { tone: 'text-emerald-300 border-emerald-300/25 bg-emerald-300/[0.06]', icon: CheckCircle2 },
  rejected: { tone: 'text-red-300 border-red-300/25 bg-red-300/[0.06]', icon: XCircle },
  expired: { tone: 'text-white/40 border-white/10 bg-white/[0.03]', icon: AlertTriangle },
  cancelled: { tone: 'text-white/40 border-white/10 bg-white/[0.03]', icon: XCircle },
};

export default async function MyCoursesPage() {
  const { locale, t } = await getTranslations();
  // Verified session only — the cookie is signed and re-checked server-side.
  const { profile, isAdmin } = await requireUserPage('/courses/my');
  const isMasterAdmin = isAdmin;

  // Admins can open every course; students see their active enrollments.
  const rawCourses = isMasterAdmin
    ? (await db.getCourses()).map((course) => ({ id: `enr_${course.id}`, courses: course }))
    : (
        await Promise.all(
          (await db.getEnrollments(profile.id))
            .filter((e) => e.status === 'active')
            .map(async (e) => ({ id: e.id, courses: await db.getCourse(e.course_id) }))
        )
      ).filter((item) => item.courses);

  // Titles and descriptions come from the database, so they need the same
  // translation pass the public catalogue gets.
  const localized = await localizeCourses(
    rawCourses.map((item) => item.courses!),
    locale
  );
  const activeCourses = rawCourses.map((item, index) => ({ ...item, courses: localized[index] }));

  // The signed-in user's OWN orders only — scoped by their verified profile id.
  // This is how a buyer reaches /payment/<id> without ever seeing the id.
  const orders = await listBuyerOrders(profile.id);
  const orderTitles = new Map(
    (
      await localizeCourses(
        (await Promise.all([...new Set(orders.map((o) => o.courseId))].map((id) => db.getCourse(id)))).filter(
          (c): c is NonNullable<typeof c> => Boolean(c)
        ),
        locale
      )
    ).map((c) => [c.id, c.title])
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white selection:text-black">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-28">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold uppercase tracking-wider mb-2 border border-white/15">
                <BookOpen size={13} /> {t('myCourses.badge')}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{t('myCourses.title')}</h1>
            </div>

            <Link
              href="/courses"
              className="px-6 py-3 bg-white/5 hover:bg-white text-white hover:text-black text-xs font-bold rounded-xl border border-white/15 transition flex items-center gap-2 w-fit shadow-md font-mono"
            >
              {t('myCourses.catalogLink')} <ArrowRight size={14} />
            </Link>
          </div>

          {/* Courses Grid */}
          {activeCourses.length === 0 ? (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
                <BookOpen size={28} />
              </div>
              <h3 className="text-xl font-black text-white">Sizda hali sotib olingan kurslar mavjud emas</h3>
              <p className="text-white/50 text-xs leading-relaxed max-w-sm mx-auto">
                Professional savdo strategiyalarini o&apos;rganish uchun o&apos;quv kurslarimiz katalogi bilan tanishing.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl mt-2 font-mono"
              >
                {t('dashboard.viewCourses')} <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCourses.map((enr) => {
                const c = enr.courses;
                if (!c) return null;

                return (
                  <div
                    key={enr.id || c.id}
                    className="bg-[#0a0a0a] border border-white/15 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-white/40 transition duration-200 relative overflow-hidden group shadow-2xl space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-white">
                          {c.level || 'Beginner'}
                        </span>
                        {isMasterAdmin && (
                          <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {t('myCourses.adminAccess')}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-black text-white group-hover:underline">
                        {c.title}
                      </h3>
                      
                      <p className="text-white/60 text-xs leading-relaxed line-clamp-2">
                        {c.short_description || c.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                      <Link
                        href={`/dashboard`}
                        className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl flex items-center justify-center gap-2 font-mono"
                      >
                        <PlayCircle size={15} />
                        <span>{t('myCourses.goToLessons')}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Buyurtmalarim — the buyer's own orders, each opening its status /
              access page. Rendered only when the user actually has orders. */}
          {orders.length > 0 && (
            <section aria-labelledby="my-orders-title" className="space-y-4 pt-2">
              <div className="flex flex-col gap-1 pb-4 border-b border-white/10">
                <h2
                  id="my-orders-title"
                  className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2"
                >
                  <Receipt size={18} className="text-white/60" /> {t('myCourses.ordersTitle')}
                </h2>
                <p className="text-white/50 text-xs leading-relaxed">{t('myCourses.ordersSubtitle')}</p>
              </div>

              <ul className="space-y-3">
                {orders.map((order) => {
                  const ui = ORDER_STATUS_UI[order.status];
                  const StatusIcon = ui.icon;
                  const approved = order.status === 'approved';
                  return (
                    <li
                      key={order.id}
                      data-order-id={order.orderId}
                      className="bg-[#0a0a0a] border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-white/30 transition"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${ui.tone}`}
                          >
                            <StatusIcon size={12} /> {t(`myCourses.status.${order.status}`)}
                          </span>
                          <span className="text-[11px] font-mono text-white/40">
                            {t('myCourses.orderNumber')} {order.orderId}
                          </span>
                        </div>
                        <p className="text-base font-black text-white truncate">
                          {orderTitles.get(order.courseId) || order.courseTitle || 'Kurs'}
                        </p>
                        <p className="text-xs font-mono text-white/50">
                          {formatAmount(order.amount, order.currency)}
                          <span className="mx-2 text-white/20">·</span>
                          {new Date(order.createdAt).toISOString().slice(0, 10)}
                        </p>
                      </div>

                      <Link
                        href={order.href}
                        className={`shrink-0 w-full sm:w-auto px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 font-mono ${
                          approved
                            ? 'bg-white hover:bg-neutral-200 text-black shadow-xl'
                            : 'bg-white/5 hover:bg-white hover:text-black text-white border border-white/15'
                        }`}
                      >
                        {approved ? t('myCourses.openAccess') : t('myCourses.openOrder')}
                        <ArrowRight size={14} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
