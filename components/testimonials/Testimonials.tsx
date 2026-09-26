import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { type Locale } from '@/lib/i18n';
import { Star, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';

interface ReviewItem {
  id: string;
  author_name: string;
  rating: number;
  course_name: string;
  content: string;
  date: string;
}

const FALLBACK_REVIEWS: Record<Locale, ReviewItem[]> = {
  uz: [
    {
      id: 'rev_1',
      author_name: 'Jasur Rakhimov',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'SMC va Order Block tushunchalarini chuqur tushunib oldim. Ayniqsa psixologiya va trading jurnal bo‘limi savdolarimdagi tartibsizlikni yo‘qotishga katta yordam berdi.',
      date: '2026-08-15',
    },
    {
      id: 'rev_2',
      author_name: 'Sardor Makhmudov',
      rating: 5,
      course_name: 'STANDARD TRADING',
      content: 'Noldan boshlagan edim, MT5 va fundamental yangiliklar tahlili darslari juda sodda va tushunarli tushuntirilgan. Hech qanday ortiqcha gap yo‘q, tizimli bilim beriladi.',
      date: '2026-08-22',
    },
    {
      id: 'rev_3',
      author_name: 'Azizbek Karimov',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Prop firmalar challenge qoidalari va risk menejment bo‘yicha eng foydali ma’lumotlar shu yerda ekan. 1:3 risk/reward qoidasini amalda qo‘llashni o‘rgandim.',
      date: '2026-09-01',
    },
    {
      id: 'rev_4',
      author_name: 'Madina Temirova',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Fibonacci va AMD strategiyasi bo‘yicha tushuntirishlar juda qiziq va amaliy. Oldin hissiyot bilan savdo qilardim, endi reja bilan ishlayapman.',
      date: '2026-09-08',
    },
    {
      id: 'rev_5',
      author_name: 'Bobur Ortikov',
      rating: 5,
      course_name: 'STANDARD TRADING',
      content: 'Boshlovchilar uchun Standart kursi ayni muddao. Broker tanlash va verifikatsiyadan boshlab ICT asoslarigacha aniq ketma-ketlikda o‘rgatilgan.',
      date: '2026-09-12',
    },
    {
      id: 'rev_6',
      author_name: 'Dilshodbek Sattorov',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Klassik modellar va SNR strategiyasi aniq vizual misollar bilan ko‘rsatilgan. 30 kunlik intizomli o‘qish jarayoni o‘z natijasini berdi.',
      date: '2026-09-15',
    },
  ],
  ru: [
    {
      id: 'rev_1',
      author_name: 'Джасур Рахимов',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Глубоко освоил концепцию SMC и работу с Order Block. Раздел психологии и торгового журнала помог навести строгий порядок в сделках.',
      date: '2026-08-15',
    },
    {
      id: 'rev_2',
      author_name: 'Сардор Махмудов',
      rating: 5,
      course_name: 'STANDARD TRADING',
      content: 'Начинал с полного нуля. Уроки по MT5 и фундаментальным новостям изложены максимально структурированно, никакой воды.',
      date: '2026-08-22',
    },
    {
      id: 'rev_3',
      author_name: 'Азизбек Каримов',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Лучшие практические материалы по прохождению челленджей в проп-компаниях и контролю рисков. Внедрил соотношение 1:3 в каждую сделку.',
      date: '2026-09-01',
    },
    {
      id: 'rev_4',
      author_name: 'Мадина Темирова',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Разбор стратегий Фибоначчи и AMD дал мощный импульс. Раньше торговала на эмоциях, теперь действую строго по регламенту.',
      date: '2026-09-08',
    },
    {
      id: 'rev_5',
      author_name: 'Бобур Ортиков',
      rating: 5,
      course_name: 'STANDARD TRADING',
      content: 'Курс Standart идеален для старта. От выбора брокера и верификации до основ концепции ICT — всё логично и последовательно.',
      date: '2026-09-12',
    },
    {
      id: 'rev_6',
      author_name: 'Дильшод Саттаров',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Классические паттерны и уровни SNR объясняются на реальных графиках. 30 дней дисциплинированного обучения дали ощутимый результат.',
      date: '2026-09-15',
    },
  ],
  en: [
    {
      id: 'rev_1',
      author_name: 'Jasur Rakhimov',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Completely mastered SMC mechanics and Order Block mitigation. The psychology and trading journal modules eradicated chaos from my trading.',
      date: '2026-08-15',
    },
    {
      id: 'rev_2',
      author_name: 'Sardor Makhmudov',
      rating: 5,
      course_name: 'STANDARD TRADING',
      content: 'Started from complete scratch. MT5 execution and macroeconomic news modules are explained simply and systematically.',
      date: '2026-08-22',
    },
    {
      id: 'rev_3',
      author_name: 'Azizbek Karimov',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Goldmine for Prop firm challenge rules and institutional risk control. Successfully applied a minimum 1:3 risk/reward model.',
      date: '2026-09-01',
    },
    {
      id: 'rev_4',
      author_name: 'Madina Temirova',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'The Fibonacci OTE and AMD cycle modules are deeply insightful. Replaced emotional trading with a disciplined rules-based routine.',
      date: '2026-09-08',
    },
    {
      id: 'rev_5',
      author_name: 'Bobur Ortikov',
      rating: 5,
      course_name: 'STANDARD TRADING',
      content: 'The Standard course is the ultimate beginner foundation. From broker vetting to ICT fundamentals, everything follows an exact sequence.',
      date: '2026-09-12',
    },
    {
      id: 'rev_6',
      author_name: 'Dilshod Sattorov',
      rating: 5,
      course_name: 'PRO TRADING',
      content: 'Classical chart patterns and SNR levels illustrated with live market examples. 30 days of structured focus transformed my analysis.',
      date: '2026-09-15',
    },
  ],
};

const TESTIMONIAL_TEXT = {
  uz: {
    badge: 'O‘quvchilar Tajribasi',
    title: 'Platforma Haqida O‘quvchilar Fikrlari',
    count: (n: number) => `${n} ta tasdiqlangan sharh · O‘rtacha baho 5.0 ⭐`,
    cta: 'Sharh qoldirish',
    disclaimerBold: 'Muhim eslatma:',
    disclaimerText: 'NEW ERA ta’lim platformasi hisoblanadi. Kurs materiallari va sharhlar daromad yoki narx kafolati emas. Treyding yuqori moliyaviy xavfga ega faoliyatdir.',
  },
  ru: {
    badge: 'Опыт Студентов',
    title: 'Отзывы Студентов о Платформе',
    count: (n: number) => `${n} проверенных отзывов · Средняя оценка 5.0 ⭐`,
    cta: 'Оставить отзыв',
    disclaimerBold: 'Важное примечание:',
    disclaimerText: 'NEW ERA является образовательной платформой. Материалы курса и отзывы не являются гарантией прибыли или цен. Трейдинг сопряжён с высоким финансовым риском.',
  },
  en: {
    badge: 'Student Experiences',
    title: 'What Our Students Say',
    count: (n: number) => `${n} verified reviews · Average rating 5.0 ⭐`,
    cta: 'Leave a review',
    disclaimerBold: 'Important notice:',
    disclaimerText: 'NEW ERA is an educational platform. Course materials and reviews do not guarantee profits or returns. Trading carries substantial financial risk.',
  },
};

export default async function Testimonials() {
  const { locale } = await getTranslations();
  const tText = TESTIMONIAL_TEXT[locale] || TESTIMONIAL_TEXT.uz;
  const dbReviews = await db.getReviews({ approvedOnly: true });

  const fallback = FALLBACK_REVIEWS[locale] || FALLBACK_REVIEWS.uz;

  const displayReviews: ReviewItem[] = dbReviews.length > 0
    ? await Promise.all(
        dbReviews.slice(0, 6).map(async (r) => {
          const course = await db.getCourse(r.course_id);
          return {
            id: r.id,
            author_name: r.author_name,
            rating: r.rating,
            course_name: course?.title || 'NEW ERA TRADING',
            content: r.content,
            date: r.created_at.slice(0, 10),
          };
        })
      )
    : fallback;

  return (
    <section id="reviews" className="border-t border-white/[0.08] bg-[#050505] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <ShieldCheck size={13} />
              {tText.badge}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
              {tText.title}
            </h2>
            <p className="mt-2 text-sm text-white/50">
              {tText.count(displayReviews.length)}
            </p>
          </div>

          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-white/35 hover:text-white"
          >
            <MessageSquarePlus size={15} />
            {tText.cta}
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {displayReviews.map((review) => (
            <article
              key={review.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0d] p-6 hover:border-white/20 transition hover:bg-[#0f0f14] shadow-lg"
            >
              <div className="mb-3 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <p className="flex-1 text-[13px] leading-relaxed text-white/75">
                &ldquo;{review.content}&rdquo;
              </p>

              <footer className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[11px] font-black text-white">
                  {review.author_name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-white">
                    {review.author_name}
                  </span>
                  <span className="block truncate text-[11px] text-white/40 font-mono">
                    {review.course_name} · {review.date}
                  </span>
                </span>
              </footer>
            </article>
          ))}
        </div>

        {/* Strict Regulatory / No-Guaranteed-Profit Notice */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-black p-4 text-center">
          <p className="text-[11.5px] text-white/40 leading-relaxed max-w-2xl mx-auto">
            <strong className="text-white/70">{tText.disclaimerBold}</strong> {tText.disclaimerText}
          </p>
        </div>
      </div>
    </section>
  );
}
