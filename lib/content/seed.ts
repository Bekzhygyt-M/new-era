import { db } from '@/lib/db';
import { type LocalCourse, type LocalModule } from '@/lib/local-db';
import { ALL_COURSES, COURSE_IDS } from '@/lib/content/curriculum';

/**
 * Seeds the catalogue from the specification (TZ §5).
 *
 * Only courses and modules are seeded — those are fixed by the specification.
 * Lessons and tests are authored by the admin through /admin, so no placeholder
 * lesson is ever inserted; the UI shows a real empty state until content exists.
 *
 * Existing rows are never overwritten, so admin edits survive a restart.
 */

const DESCRIPTIONS: Record<string, { description: string; short: string }> = {
  standard: {
    description:
      'Tradingni 0 dan o‘rganish. Trading asoslari, brokerlar, MT5, Forex sessiyalari, fundamental yangiliklar, grafik asoslari, risk management va prop firmalar.',
    short: 'Noldan boshlab professional treyding asoslari.',
  },
  pro: {
    description:
      'Professional tahlil va strategiyalar. Advanced Technical Analysis, SMC, entry strategiyalar, Smart Money Analysis, News + Session Analysis, real chart tahlili, professional risk management, backtest va trading journal.',
    short: 'Smart Money Concepts, Liquidity va Prop Challenge strategiyalari.',
  },
  vip: {
    description:
      'Individual yondashuv va mentorlik. PRO’dagi barcha darslar, shaxsiy chart tahlili, individual entry tahlili, yopiq VIP guruh, Trading Journal va Risk Management nazorati.',
    short: 'Bosh treyder bilan 1-on-1 individual mentorlik.',
  },
};

/**
 * ru/en overrides for the three fixed courses (TZ §5). Seeded once as
 * `translations` rows so /courses shows real copy in every language without
 * an admin having to retype the spec by hand — same treatment as the syllabus
 * in curriculum-i18n.ts. An admin edit in /admin/translations always wins,
 * since this only fills rows that don't exist yet (see seedCourseTranslations).
 */
const TRANSLATIONS: Record<
  string,
  Record<'ru' | 'en', { title: string; description: string; short: string }>
> = {
  standard: {
    ru: {
      title: 'STANDARD TRADING',
      description:
        'Трейдинг с нуля. Основы трейдинга, брокеры, MT5, форекс-сессии, фундаментальные новости, основы графиков, риск-менеджмент и proп-фирмы.',
      short: 'Профессиональные основы трейдинга с нуля.',
    },
    en: {
      title: 'STANDARD TRADING',
      description:
        'Learn trading from zero. Trading fundamentals, brokers, MT5, Forex sessions, fundamental news, chart basics, risk management and prop firms.',
      short: 'Professional trading fundamentals, starting from zero.',
    },
  },
  pro: {
    ru: {
      title: 'PRO TRADING',
      description:
        'Профессиональный анализ и стратегии. Advanced Technical Analysis, SMC, стратегии входа, Smart Money Analysis, News + Session Analysis, анализ реальных графиков, профессиональный риск-менеджмент, бэктест и торговый журнал.',
      short: 'Smart Money Concepts, Liquidity и стратегии Prop Challenge.',
    },
    en: {
      title: 'PRO TRADING',
      description:
        'Professional analysis and strategies. Advanced Technical Analysis, SMC, entry strategies, Smart Money Analysis, News + Session Analysis, real chart analysis, professional risk management, backtesting and a trading journal.',
      short: 'Smart Money Concepts, Liquidity and Prop Challenge strategies.',
    },
  },
  vip: {
    ru: {
      title: 'VIP TRADING',
      description:
        'Индивидуальный подход и менторство. Все уроки PRO, личный разбор графиков, разбор ваших входов, закрытая VIP-группа, контроль торгового журнала и риск-менеджмента.',
      short: 'Индивидуальное менторство 1-на-1 с главным трейдером.',
    },
    en: {
      title: 'VIP TRADING',
      description:
        'A personal approach plus mentorship. Every PRO lesson, personal chart review, review of your own entries, a private VIP group, and oversight of your trading journal and risk management.',
      short: 'One-on-one mentorship with the lead trader.',
    },
  },
};

/** Deterministic module id so re-seeding never duplicates a module. */
function moduleId(courseSlug: string, index: number): string {
  const base = { standard: '44444444', pro: '55555555', vip: '66666666' }[courseSlug] || '77777777';
  return `${base}-0000-0000-0000-${String(index).padStart(12, '0')}`;
}

export function buildCatalogSeed(): { courses: LocalCourse[]; modules: LocalModule[]; lessons: [] } {
  const courses: LocalCourse[] = [];
  const modules: LocalModule[] = [];

  ALL_COURSES.forEach((content, courseIndex) => {
    const meta = DESCRIPTIONS[content.slug];

    courses.push({
      id: content.courseId,
      title: `${content.name} TRADING`,
      slug: content.slug,
      description: meta.description,
      short_description: meta.short,
      level: content.slug === 'standard' ? 'beginner' : content.slug,
      price: content.price,
      currency: 'UZS',
      published: true,
      featured: true,
      thumbnail_url: null,
      order_index: courseIndex + 1,
      certificate_prefix: content.slug.slice(0, 3).toUpperCase(),
    });

    content.modules.forEach((module, moduleIndex) => {
      const isLast = moduleIndex === content.modules.length - 1;
      modules.push({
        id: moduleId(content.slug, moduleIndex + 1),
        course_id: content.courseId,
        title: `${module.number} ${module.emoji} ${module.title}`,
        description: module.topics.join(' • '),
        order_index: moduleIndex + 1,
        icon: module.emoji,
        is_published: true,
        // TZ §16/§23: the practical work is attached to the closing module.
        requires_backtest: isLast && content.slug === 'pro',
        requires_journal: isLast && content.slug === 'pro',
      });
    });
  });

  return { courses, modules, lessons: [] };
}

/**
 * Fills in the ru/en translation rows above for whichever of the three
 * courses don't have one yet. Only inserts — never overwrites a row an admin
 * already edited in /admin/translations.
 */
async function seedCourseTranslations() {
  for (const locale of ['ru', 'en'] as const) {
    const existing = new Set((await db.getTranslations('course', locale)).map((t) => t.entity_id));
    for (const content of ALL_COURSES) {
      if (existing.has(content.courseId)) continue;
      const copy = TRANSLATIONS[content.slug]?.[locale];
      if (!copy) continue;
      await db.saveTranslation({
        entity: 'course',
        entity_id: content.courseId,
        locale,
        title: copy.title,
        description: copy.description,
        short_description: copy.short,
      });
    }
  }
}

let seeded = false;

/** Idempotent; safe to call on every server start. */
export async function seedCatalog() {
  if (seeded) return;
  seeded = true;
  try {
    const seed = buildCatalogSeed();
    await db.seedCatalog(seed);
    await seedCourseTranslations();
  } catch (err) {
    console.error('[seed] catalogue seeding failed:', err);
  }
}

export { COURSE_IDS };
