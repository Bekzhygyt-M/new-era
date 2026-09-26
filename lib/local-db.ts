import fs from 'fs';
import os from 'os';
import { DB_DIR as SHARED_DB_DIR } from '@/lib/paths';
import path from 'path';

/**
 * NEW ERA local persistence layer.
 *
 * A single JSON document on disk, written atomically (tmp file + rename) so a
 * crash mid-write cannot corrupt the database. Supabase, when configured, is
 * kept in sync opportunistically by the calling code — this file stays the
 * authoritative store so the platform runs with zero external configuration.
 *
 * Never store plaintext passwords here: profiles carry `password_hash` only
 * (see lib/auth/password.ts).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocalCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  level: string;
  price: number;
  currency: string;
  published: boolean;
  featured?: boolean;
  thumbnail_url?: string | null;
  order_index?: number;
  certificate_prefix?: string;
}

export interface LocalModule {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  order_index: number;
  icon?: string | null;
  is_published?: boolean;
  requires_backtest?: boolean;
  requires_journal?: boolean;
}

export interface LocalLesson {
  id: string;
  module_id: string;
  title: string;
  short_description?: string | null;
  description?: string | null;
  /** TZ §11: lesson summary shown under the video. */
  summary?: string | null;
  /** TZ §11: key terms list shown after the summary. */
  key_terms?: { term: string; definition: string }[];
  materials?: { title: string; url: string; type?: string }[];
  video_url: string;
  video_storage_path?: string | null;
  video_provider?: string;
  duration: number;
  order_index: number;
  xp_reward: number;
  watch_requirement: number;
  is_published: boolean;
  preview_enabled?: boolean;
  allow_seeking?: boolean;
}

export interface LocalAnswer {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
  order_index: number;
}

export interface LocalQuestion {
  id: string;
  test_id: string;
  question: string;
  order_index: number;
  points: number;
  multiple: boolean;
}

export interface LocalTest {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  max_attempts: number | null;
  is_published: boolean;
  created_at: string;
}

export interface LocalLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  watched_seconds: number;
  watch_percentage: number;
  video_completed: boolean;
  test_passed: boolean;
  test_score: number;
  xp_earned: boolean;
  completed: boolean;
  completed_at?: string | null;
  updated_at: string;
}

export interface LocalTestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  lesson_id: string;
  score: number;
  passed: boolean;
  correct_count: number;
  total_questions: number;
  answers_data: Record<string, string>;
  created_at: string;
}

export interface LocalXpTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  source: 'lesson' | 'test' | 'module' | 'course' | 'admin';
  reference_id?: string | null;
  created_at: string;
}

export interface LocalPayment {
  id: string;
  order_id: string;
  user_id: string;
  course_id: string;
  amount: number;
  currency: string;
  provider: string;
  status: 'pending' | 'receipt_submitted' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  first_name?: string;
  last_name?: string;
  phone?: string;
  comment?: string | null;
  receipt_url?: string | null;
  expires_at?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  rejection_reason?: string;
  approved_by?: string;
  created_at: string;
  paid_at?: string;
  courses?: LocalCourse | null;
  profiles?: LocalProfile | null;
}

export interface LocalProfile {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: 'student' | 'admin' | 'instructor';
  level: string;
  xp: number;
  phone?: string;
  avatar_url?: string;
  /** scrypt hash — never a plaintext password. */
  password_hash?: string | null;
  language?: 'uz' | 'ru' | 'en';
  theme?: 'dark' | 'light';
  last_active_at?: string;
  created_at: string;
}

export interface LocalEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'active' | 'expired' | 'revoked';
  purchased_at: string;
  expires_at?: string | null;
  plan_period?: 'daily' | 'monthly' | 'yearly';
  source: string;
  completed_at?: string | null;
}

export interface LocalNotification {
  id: string;
  user_id: string | 'all';
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  read_by?: string[];
  created_at: string;
}

export interface LocalJournalTrade {
  id: string;
  user_id: string;
  date: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: string;
  exitPrice: string;
  stopLoss?: string;
  takeProfit?: string;
  pnl: number;
  rr: string;
  status: 'WIN' | 'LOSS' | 'BREAKEVEN';
  strategy: string;
  screenshot_url?: string | null;
  note: string;
  created_at: string;
}

export interface LocalBacktest {
  id: string;
  user_id: string;
  module_id?: string | null;
  name: string;
  instrument: string;
  timeframe: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  rr: string;
  pnlPercent: number;
  maxDD: string;
  profitFactor: string;
  screenshot_url?: string | null;
  notes: string;
  created_at: string;
}

export interface LocalCertificate {
  id: string;
  certificate_id: string;
  user_id: string;
  course_id: string;
  full_name: string;
  course_title: string;
  issued_at: string;
  revoked: boolean;
}

export interface LocalDisclaimerVersion {
  id: string;
  version: string;
  content: string;
  summary_points: string[];
  is_active: boolean;
  created_at: string;
}

export interface LocalDisclaimerAcceptance {
  id: string;
  user_id: string;
  version: string;
  accepted_at: string;
  ip?: string | null;
  user_agent?: string | null;
}

export interface LocalPaymentMethod {
  id: string;
  name: string;
  logo: string;
  enabled: boolean;
  supported: boolean;
  order_index: number;
}

export interface LocalReview {
  id: string;
  user_id: string;
  course_id: string;
  author_name: string;
  rating: number;
  content: string;
  approved: boolean;
  created_at: string;
}

export interface LocalFaq {
  id: string;
  question_uz: string;
  question_ru?: string;
  question_en?: string;
  answer_uz: string;
  answer_ru?: string;
  answer_en?: string;
  order_index: number;
  published: boolean;
}

/**
 * An admin-mediated password reset (TZ §9).
 *
 * The raw token is never stored — only its SHA-256 hash — so a leaked database
 * file cannot be used to take over an account.
 */
export interface LocalPasswordReset {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  token_hash?: string | null;
  created_at: string;
  approved_at?: string | null;
  expires_at?: string | null;
  used_at?: string | null;
}

/**
 * A ru/en override for a piece of course content (TZ §25, §28).
 *
 * The base row always holds the Uzbek original; a missing field here simply
 * falls back to it, so a partial translation is always safe to publish.
 */
export interface LocalTranslation {
  id: string;
  entity: 'course' | 'module' | 'lesson';
  entity_id: string;
  locale: 'ru' | 'en';
  title?: string | null;
  short_description?: string | null;
  description?: string | null;
  summary?: string | null;
  key_terms?: { term: string; definition: string }[] | null;
  updated_at: string;
}

export interface LocalActivityLog {
  id: string;
  user_id: string;
  action: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LocalMessage {
  id: string;
  user_id: string;
  sender: 'user' | 'admin';
  text: string;
  read: boolean;
  created_at: string;
}

export interface CardDetail {
  id: string;
  type: string;
  number: string;
  raw_number: string;
  holder: string;
  is_primary?: boolean;
}

export interface PricingPlanPeriod {
  daily: number;
  monthly: number;
  yearly: number;
}

export interface AdminSettings {
  passing_score: number;
  watch_requirement: number;
  xp_lesson: number;
  xp_test: number;
  xp_module: number;
  xp_course: number;
  payment_window_minutes: number;
  currency: string;
  support_telegram: string;
  support_email: string;
  payment_instructions: string;
  card_number: string;
  card_holder: string;
  cards?: CardDetail[];
  pricing?: {
    standard: PricingPlanPeriod;
    pro: PricingPlanPeriod;
  };
  course_limit_days?: number;
  instagram_url?: string;
  telegram_channel_url?: string;
  youtube_url?: string;
  level_thresholds: { name: string; xp: number }[];
}

interface LocalDatabase {
  courses: LocalCourse[];
  modules: LocalModule[];
  lessons: LocalLesson[];
  tests: LocalTest[];
  questions: LocalQuestion[];
  answers: LocalAnswer[];
  payments: LocalPayment[];
  profiles: LocalProfile[];
  enrollments: LocalEnrollment[];
  lesson_progress: LocalLessonProgress[];
  test_attempts: LocalTestAttempt[];
  xp_transactions: LocalXpTransaction[];
  notifications: LocalNotification[];
  journals: LocalJournalTrade[];
  backtests: LocalBacktest[];
  certificates: LocalCertificate[];
  disclaimer_versions: LocalDisclaimerVersion[];
  disclaimer_acceptances: LocalDisclaimerAcceptance[];
  payment_methods: LocalPaymentMethod[];
  activity_logs: LocalActivityLog[];
  messages: LocalMessage[];
  reviews: LocalReview[];
  faqs: LocalFaq[];
  translations: LocalTranslation[];
  password_resets: LocalPasswordReset[];
  settings: AdminSettings;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_DIR = SHARED_DB_DIR;
const DB_FILE = path.join(DB_DIR, 'db.json');

export const MASTER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
const MASTER_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

export const COURSE_IDS = {
  standard: '11111111-1111-1111-1111-111111111111',
  pro: '22222222-2222-2222-2222-222222222222',
};

export const DEFAULT_CARDS: CardDetail[] = [
  {
    id: 'card_humo',
    type: 'Humo',
    number: '9860 1701 1477 2172',
    raw_number: '9860170114772172',
    holder: 'Abbos Erkinov',
    is_primary: true,
  },
  {
    id: 'card_uzcard',
    type: 'Uzkart',
    number: '5614 6821 1727 0571',
    raw_number: '5614682117270571',
    holder: 'Abbos Erkinov',
    is_primary: false,
  },
  {
    id: 'card_visa',
    type: 'Visa',
    number: '4023 0602 4867 3021',
    raw_number: '4023060248673021',
    holder: 'Abbos Erkinov',
    is_primary: false,
  },
];

export const DEFAULT_SETTINGS: AdminSettings = {
  passing_score: 90,
  watch_requirement: 90,
  xp_lesson: 50,
  xp_test: 100,
  xp_module: 300,
  xp_course: 1000,
  payment_window_minutes: 15,
  currency: 'UZS',
  support_telegram: 'https://t.me/newerasupport_bot',
  support_email: 'support@newera.uz',
  payment_instructions:
    "To'lovni quyidagi karta raqamlaridan biriga o'tkazing va chek skrinshotini yuklang. Admin 15 daqiqa ichida tekshiradi.",
  card_number: '9860 1701 1477 2172',
  card_holder: 'Abbos Erkinov',
  cards: DEFAULT_CARDS,
  pricing: {
    standard: {
      daily: 19000,
      monthly: 299000,
      yearly: 2499000,
    },
    pro: {
      daily: 39000,
      monthly: 499000,
      yearly: 4999000,
    },
  },
  course_limit_days: 30,
  instagram_url: 'https://instagram.com/newera_trading',
  telegram_channel_url: 'https://t.me/newera_trading',
  youtube_url: 'https://youtube.com/@newera_trading',
  level_thresholds: [
    { name: 'Beginner', xp: 0 },
    { name: 'Intermediate', xp: 1000 },
    { name: 'Advanced', xp: 2500 },
    { name: 'Pro', xp: 5000 },
  ],
};

const DEFAULT_PAYMENT_METHODS: LocalPaymentMethod[] = [
  { id: 'pm_visa', name: 'VISA', logo: 'visa', enabled: true, supported: true, order_index: 1 },
  { id: 'pm_mastercard', name: 'Mastercard', logo: 'mastercard', enabled: true, supported: true, order_index: 2 },
  { id: 'pm_paypal', name: 'PayPal', logo: 'paypal', enabled: true, supported: false, order_index: 3 },
  { id: 'pm_applepay', name: 'Apple Pay', logo: 'applepay', enabled: true, supported: false, order_index: 4 },
  { id: 'pm_googlepay', name: 'Google Pay', logo: 'googlepay', enabled: true, supported: false, order_index: 5 },
  { id: 'pm_stripe', name: 'Stripe', logo: 'stripe', enabled: true, supported: false, order_index: 6 },
  { id: 'pm_amex', name: 'American Express', logo: 'amex', enabled: true, supported: false, order_index: 7 },
  { id: 'pm_unionpay', name: 'UnionPay', logo: 'unionpay', enabled: true, supported: false, order_index: 8 },
];

const DEFAULT_DISCLAIMER: LocalDisclaimerVersion = {
  id: 'disc_v1',
  version: '1.0',
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  summary_points: [
    'Men NEW ERA Trading Platformasi ta’lim platformasi ekanligini tushundim.',
    'Trading yuqori riskli faoliyat.',
    'Kurs foyda kafolatlamaydi.',
    'Barcha qarorlar shaxsiy javobgarligimda.',
  ],
  content: [
    'NEW ERA — TO‘LIQ RISK BILDIRGISI (RISK DISCLAIMER)',
    '',
    '1. TA’LIM MAQSADI',
    'NEW ERA ta’lim platformasi hisoblanadi. Platformadagi barcha video darslar, matnlar, strategiyalar, tahlillar va misollar faqat ta’lim maqsadida taqdim etiladi.',
    '',
    '2. MOLIYAVIY MASLAHAT EMAS',
    'Kurs materiallari moliyaviy maslahat, investitsiya tavsiyasi yoki kafolatlangan daromad va’dasi emas. NEW ERA litsenziyalangan moliyaviy maslahatchi sifatida faoliyat yuritmaydi.',
    '',
    '3. RISK DARAJASI',
    'Forex, CFD, kripto va boshqa moliyaviy instrumentlar bilan savdo qilish yuqori darajadagi riskni o‘z ichiga oladi. Leverage (kredit yelkasi) zararni ham xuddi shunday darajada kuchaytiradi. Siz kiritgan mablag‘ning bir qismini yoki to‘liq hammasini yo‘qotishingiz mumkin.',
    '',
    '4. KAFOLAT YO‘QLIGI',
    'O‘tmishdagi natijalar kelajakdagi natijalarni kafolatlamaydi. Backtest natijalari real bozor sharoitidan farq qilishi mumkin. Hech bir strategiya foyda kafolatlamaydi.',
    '',
    '5. SHAXSIY JAVOBGARLIK',
    'Barcha savdo qarorlari va ularning moliyaviy oqibatlari to‘liq foydalanuvchining shaxsiy javobgarligida. NEW ERA, uning mualliflari va mentorlari foydalanuvchi ko‘rgan zarar uchun javobgar emas.',
    '',
    '6. MABLAG‘ MANBAI',
    'Faqat yo‘qotishga tayyor bo‘lgan mablag‘ bilan savdo qiling. Qarz, kredit yoki hayotiy zaruriy mablag‘lardan foydalanmang.',
    '',
    '7. UCHINCHI TOMONLAR',
    'Brokerlar va prop firmalar mustaqil tashkilotlardir. NEW ERA ularning xizmatlari, to‘lovlari yoki shartlari uchun javobgarlik olmaydi.',
    '',
    '8. ROZILIK',
    'Ushbu hujjatni qabul qilish orqali siz yuqoridagi barcha shartlarni o‘qiganingizni, tushunganingizni va ular bilan roziligingizni tasdiqlaysiz.',
  ].join('\n'),
};

function emptyDb(): LocalDatabase {
  return {
    courses: [],
    modules: [],
    lessons: [],
    tests: [],
    questions: [],
    answers: [],
    payments: [],
    profiles: [],
    enrollments: [],
    lesson_progress: [],
    test_attempts: [],
    xp_transactions: [],
    notifications: [],
    journals: [],
    backtests: [],
    certificates: [],
    disclaimer_versions: [DEFAULT_DISCLAIMER],
    disclaimer_acceptances: [],
    payment_methods: [...DEFAULT_PAYMENT_METHODS],
    activity_logs: [],
    messages: [],
    reviews: [],
    faqs: [],
    translations: [],
    password_resets: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

let cachedDb: LocalDatabase | null = null;
/** mtime of the file the cache was built from, so external writes invalidate it. */
let cachedMtimeMs = 0;

/** Current mtime, or 0 when the file is missing. */
function dbMtime(): number {
  try {
    return fs.statSync(DB_FILE).mtimeMs;
  } catch {
    return 0;
  }
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Fill in collections added by later versions of the schema. */
function migrate(db: Partial<LocalDatabase> & Record<string, unknown>): LocalDatabase {
  const base = emptyDb();
  const merged: LocalDatabase = { ...base, ...db } as LocalDatabase;

  for (const key of Object.keys(base) as (keyof LocalDatabase)[]) {
    if (key === 'settings') continue;
    if (!Array.isArray(merged[key])) {
      (merged[key] as unknown) = base[key];
    }
  }

  merged.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  if (!merged.disclaimer_versions.length) merged.disclaimer_versions = [DEFAULT_DISCLAIMER];
  if (!merged.payment_methods.length) merged.payment_methods = [...DEFAULT_PAYMENT_METHODS];

  // Strip any plaintext password left over from an older build.
  merged.profiles = merged.profiles.map((p: LocalProfile & { password?: string }) => {
    if (p && typeof p === 'object' && 'password' in p) {
      const { password, ...rest } = p;
      return { ...rest, password_hash: rest.password_hash ?? null };
    }
    return p;
  });

  // Legacy journal/backtest/message rows had no owner — drop them rather than
  // showing one user's data to everybody.
  merged.journals = merged.journals.filter((j) => Boolean(j?.user_id));
  merged.backtests = merged.backtests.filter((b) => Boolean(b?.user_id));
  merged.messages = merged.messages.filter((m) => Boolean(m?.user_id));

  // The master admin profile must always exist (password is set and verified).
  const DEFAULT_ADMIN_HASH = 'scrypt$16384$8$1$fe2f505129671ea786ad75a7e0fca96c$3ce4a682dff0bbd2854740fdfbfa552010a29f4766935d8ab5ed4052b8f311f607f5d309d25adca572aed14451746dfcb240fc667134a0e8648e80aee02c01d2';
  const existingAdmin = merged.profiles.find((p) => p.email?.toLowerCase() === MASTER_ADMIN_EMAIL);
  if (!existingAdmin) {
    merged.profiles.push({
      id: MASTER_ADMIN_ID,
      email: MASTER_ADMIN_EMAIL,
      full_name: 'Bosh Admin',
      role: 'admin',
      level: 'Pro',
      xp: 5000,
      password_hash: DEFAULT_ADMIN_HASH,
      created_at: new Date().toISOString(),
    });
  } else if (!existingAdmin.password_hash) {
    existingAdmin.password_hash = DEFAULT_ADMIN_HASH;
  }

  return merged;
}

/**
 * Reads the database, re-reading from disk whenever the file changed.
 *
 * The in-memory copy cannot be trusted on its own: Next may load this module in
 * more than one bundle, and each copy would otherwise keep serving its own
 * stale snapshot after another one wrote. Comparing mtime keeps every instance
 * honest for the price of one stat() per call.
 */
function loadDatabase(): LocalDatabase {
  const mtime = dbMtime();
  if (cachedDb && mtime === cachedMtimeMs) return cachedDb;

  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

    if (mtime) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = migrate(JSON.parse(raw));
      cachedMtimeMs = mtime;
      return cachedDb;
    }

    // In serverless / tmp fallback, check if a bundled seed db.json exists in process.cwd()/data/db.json
    const bundledDb = path.join(process.cwd(), 'data', 'db.json');
    if (bundledDb !== DB_FILE && fs.existsSync(bundledDb)) {
      try {
        const raw = fs.readFileSync(bundledDb, 'utf-8');
        cachedDb = migrate(JSON.parse(raw));
        saveDatabase(cachedDb);
        return cachedDb;
      } catch (bundleErr) {
        console.error('[local-db] failed to seed from bundled db.json:', bundleErr);
      }
    }
  } catch (err) {
    console.error('[local-db] read failed, starting from an empty database:', err);
  }

  cachedDb = migrate({});
  saveDatabase(cachedDb);
  return cachedDb;
}

/** Atomic write: serialize to a temp file in the same directory, then rename. */
function saveDatabase(db: LocalDatabase) {
  cachedDb = db;
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    const tmp = path.join(DB_DIR, `.db.${process.pid}.${Date.now()}.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(tmp, DB_FILE);
    cachedMtimeMs = dbMtime();
  } catch (err) {
    console.error('[local-db] write failed to DB_DIR:', err);
    // If saving to DB_DIR failed (e.g. read-only filesystem), fallback to os.tmpdir()
    try {
      const fallbackDir = path.join(os.tmpdir(), 'newera_data', 'data');
      if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
      const fallbackTmp = path.join(fallbackDir, `.db.${process.pid}.${Date.now()}.tmp`);
      const fallbackFile = path.join(fallbackDir, 'db.json');
      fs.writeFileSync(fallbackTmp, JSON.stringify(db, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(fallbackTmp, fallbackFile);
      console.log('[local-db] successfully saved database to fallback tmp dir:', fallbackFile);
    } catch (fallbackErr) {
      console.error('[local-db] emergency fallback write to tmp also failed:', fallbackErr);
    }
  }
}

/** Read-modify-write helper so every mutation goes through one code path. */
function mutate<T>(fn: (db: LocalDatabase) => T): T {
  const db = loadDatabase();
  const result = fn(db);
  saveDatabase(db);
  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const localDb = {
  raw: () => loadDatabase(),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings(): AdminSettings {
    return { ...DEFAULT_SETTINGS, ...loadDatabase().settings };
  },

  saveSettings(patch: Partial<AdminSettings>): AdminSettings {
    return mutate((db) => {
      db.settings = { ...DEFAULT_SETTINGS, ...db.settings, ...patch };
      return db.settings;
    });
  },

  // ── Profiles ───────────────────────────────────────────────────────────────
  getProfiles(): LocalProfile[] {
    return loadDatabase().profiles;
  },

  getProfile(idOrEmail?: string | null): LocalProfile | null {
    if (!idOrEmail) return null;
    const needle = idOrEmail.toLowerCase();
    return (
      loadDatabase().profiles.find((p) => p.id === idOrEmail || p.email?.toLowerCase() === needle) || null
    );
  },

  saveProfile(profile: Partial<LocalProfile>): LocalProfile {
    return mutate((db) => {
      const idx = db.profiles.findIndex(
        (p) =>
          (profile.id && p.id === profile.id) ||
          (profile.email && p.email?.toLowerCase() === profile.email.toLowerCase())
      );

      if (idx >= 0) {
        db.profiles[idx] = { ...db.profiles[idx], ...profile } as LocalProfile;
        return db.profiles[idx];
      }

      const email = (profile.email || '').toLowerCase();
      const created: LocalProfile = {
        id: profile.id || newId('usr'),
        email,
        full_name: profile.full_name || 'Yangi Treyder',
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role || (email === MASTER_ADMIN_EMAIL ? 'admin' : 'student'),
        level: profile.level || 'Beginner',
        xp: profile.xp ?? 0,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        password_hash: profile.password_hash ?? null,
        language: profile.language || 'uz',
        theme: profile.theme || 'dark',
        created_at: profile.created_at || new Date().toISOString(),
      };
      db.profiles.push(created);
      return created;
    });
  },

  deleteProfile(idOrEmail: string): boolean {
    return mutate((db) => {
      const target = db.profiles.find(
        (p) => p.id === idOrEmail || p.email?.toLowerCase() === idOrEmail.toLowerCase()
      );
      if (!target) return false;
      if (target.email?.toLowerCase() === MASTER_ADMIN_EMAIL) return false;

      const uid = target.id;
      db.profiles = db.profiles.filter((p) => p.id !== uid);
      db.enrollments = db.enrollments.filter((e) => e.user_id !== uid);
      db.payments = db.payments.filter((p) => p.user_id !== uid);
      db.lesson_progress = db.lesson_progress.filter((p) => p.user_id !== uid);
      db.test_attempts = db.test_attempts.filter((a) => a.user_id !== uid);
      db.xp_transactions = db.xp_transactions.filter((x) => x.user_id !== uid);
      db.notifications = db.notifications.filter((n) => n.user_id !== uid);
      db.journals = db.journals.filter((j) => j.user_id !== uid);
      db.backtests = db.backtests.filter((b) => b.user_id !== uid);
      db.certificates = db.certificates.filter((c) => c.user_id !== uid);
      db.messages = db.messages.filter((m) => m.user_id !== uid);
      db.activity_logs = db.activity_logs.filter((l) => l.user_id !== uid);
      db.reviews = db.reviews.filter((r) => r.user_id !== uid);
      return true;
    });
  },

  touchProfile(userId: string) {
    mutate((db) => {
      const p = db.profiles.find((x) => x.id === userId);
      if (p) p.last_active_at = new Date().toISOString();
    });
  },

  // ── Courses ────────────────────────────────────────────────────────────────
  getCourses(): LocalCourse[] {
    return [...loadDatabase().courses].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  },

  getCourse(idOrSlug?: string | null): LocalCourse | null {
    if (!idOrSlug) return null;
    return loadDatabase().courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) || null;
  },

  saveCourse(course: Partial<LocalCourse>): LocalCourse {
    return mutate((db) => {
      const idx = db.courses.findIndex((c) => c.id === course.id || (course.slug && c.slug === course.slug));
      if (idx >= 0) {
        db.courses[idx] = { ...db.courses[idx], ...course } as LocalCourse;
        return db.courses[idx];
      }
      const created: LocalCourse = {
        id: course.id || newId('crs'),
        title: course.title || 'Yangi kurs',
        slug: course.slug || newId('course'),
        description: course.description || '',
        short_description: course.short_description || '',
        level: course.level || 'beginner',
        price: Number(course.price) || 0,
        currency: course.currency || 'UZS',
        published: course.published !== false,
        featured: course.featured ?? false,
        thumbnail_url: course.thumbnail_url ?? null,
        order_index: course.order_index ?? db.courses.length + 1,
        certificate_prefix: course.certificate_prefix || 'NE',
      };
      db.courses.push(created);
      return created;
    });
  },

  deleteCourse(id: string): boolean {
    return mutate((db) => {
      const before = db.courses.length;
      db.courses = db.courses.filter((c) => c.id !== id);
      const moduleIds = db.modules.filter((m) => m.course_id === id).map((m) => m.id);
      db.modules = db.modules.filter((m) => m.course_id !== id);
      db.lessons = db.lessons.filter((l) => !moduleIds.includes(l.module_id));
      return db.courses.length < before;
    });
  },

  // ── Modules ────────────────────────────────────────────────────────────────
  getModules(courseId?: string): LocalModule[] {
    const all = loadDatabase().modules;
    const list = courseId ? all.filter((m) => m.course_id === courseId) : all;
    return [...list].sort((a, b) => a.order_index - b.order_index);
  },

  getModule(id?: string | null): LocalModule | null {
    if (!id) return null;
    return loadDatabase().modules.find((m) => m.id === id) || null;
  },

  saveModule(module: Partial<LocalModule>): LocalModule {
    return mutate((db) => {
      const idx = db.modules.findIndex((m) => m.id === module.id);
      if (idx >= 0) {
        db.modules[idx] = { ...db.modules[idx], ...module } as LocalModule;
        return db.modules[idx];
      }
      const created: LocalModule = {
        id: module.id || newId('mod'),
        course_id: module.course_id || COURSE_IDS.standard,
        title: module.title || 'Yangi modul',
        description: module.description ?? null,
        order_index: Number(module.order_index) || db.modules.filter((m) => m.course_id === module.course_id).length + 1,
        icon: module.icon ?? null,
        is_published: module.is_published !== false,
        requires_backtest: module.requires_backtest ?? false,
        requires_journal: module.requires_journal ?? false,
      };
      db.modules.push(created);
      return created;
    });
  },

  deleteModule(id: string): boolean {
    return mutate((db) => {
      const before = db.modules.length;
      db.modules = db.modules.filter((m) => m.id !== id);
      db.lessons = db.lessons.filter((l) => l.module_id !== id);
      return db.modules.length < before;
    });
  },

  // ── Lessons ────────────────────────────────────────────────────────────────
  getLessons(moduleId?: string): LocalLesson[] {
    const all = loadDatabase().lessons;
    const list = moduleId ? all.filter((l) => l.module_id === moduleId) : all;
    return [...list].sort((a, b) => a.order_index - b.order_index);
  },

  getLesson(id?: string | null): LocalLesson | null {
    if (!id) return null;
    return loadDatabase().lessons.find((l) => l.id === id) || null;
  },

  /** All lessons of a course, in module order then lesson order. */
  getCourseLessons(courseId: string): LocalLesson[] {
    const db = loadDatabase();
    const modules = db.modules
      .filter((m) => m.course_id === courseId)
      .sort((a, b) => a.order_index - b.order_index);
    const out: LocalLesson[] = [];
    for (const m of modules) {
      out.push(
        ...db.lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.order_index - b.order_index)
      );
    }
    return out;
  },

  saveLesson(lesson: Partial<LocalLesson>): LocalLesson {
    return mutate((db) => {
      const idx = db.lessons.findIndex((l) => l.id === lesson.id);
      if (idx >= 0) {
        db.lessons[idx] = { ...db.lessons[idx], ...lesson } as LocalLesson;
        return db.lessons[idx];
      }
      const settings = { ...DEFAULT_SETTINGS, ...db.settings };
      const created: LocalLesson = {
        id: lesson.id || newId('les'),
        module_id: lesson.module_id || '',
        title: lesson.title || 'Yangi dars',
        short_description: lesson.short_description ?? null,
        description: lesson.description ?? null,
        summary: lesson.summary ?? null,
        key_terms: lesson.key_terms ?? [],
        materials: lesson.materials ?? [],
        video_url: lesson.video_url || '',
        video_storage_path: lesson.video_storage_path ?? null,
        video_provider: lesson.video_provider || 'file',
        duration: Number(lesson.duration) || 0,
        order_index:
          Number(lesson.order_index) || db.lessons.filter((l) => l.module_id === lesson.module_id).length + 1,
        xp_reward: Number(lesson.xp_reward) || settings.xp_lesson,
        watch_requirement: Number(lesson.watch_requirement) || settings.watch_requirement,
        is_published: lesson.is_published !== false,
        preview_enabled: lesson.preview_enabled ?? false,
        allow_seeking: lesson.allow_seeking ?? false,
      };
      db.lessons.push(created);
      return created;
    });
  },

  deleteLesson(id: string): boolean {
    return mutate((db) => {
      const before = db.lessons.length;
      db.lessons = db.lessons.filter((l) => l.id !== id);
      const testIds = db.tests.filter((t) => t.lesson_id === id).map((t) => t.id);
      db.tests = db.tests.filter((t) => t.lesson_id !== id);
      const questionIds = db.questions.filter((q) => testIds.includes(q.test_id)).map((q) => q.id);
      db.questions = db.questions.filter((q) => !testIds.includes(q.test_id));
      db.answers = db.answers.filter((a) => !questionIds.includes(a.question_id));
      db.lesson_progress = db.lesson_progress.filter((p) => p.lesson_id !== id);
      return db.lessons.length < before;
    });
  },

  // ── Tests ──────────────────────────────────────────────────────────────────
  getTests(): LocalTest[] {
    return loadDatabase().tests;
  },

  getTest(id?: string | null): LocalTest | null {
    if (!id) return null;
    return loadDatabase().tests.find((t) => t.id === id) || null;
  },

  getTestByLesson(lessonId: string): LocalTest | null {
    return loadDatabase().tests.find((t) => t.lesson_id === lessonId) || null;
  },

  saveTest(test: Partial<LocalTest>): LocalTest {
    return mutate((db) => {
      const idx = db.tests.findIndex((t) => t.id === test.id);
      if (idx >= 0) {
        db.tests[idx] = { ...db.tests[idx], ...test } as LocalTest;
        return db.tests[idx];
      }
      const settings = { ...DEFAULT_SETTINGS, ...db.settings };
      const created: LocalTest = {
        id: test.id || newId('tst'),
        lesson_id: test.lesson_id || '',
        title: test.title || 'Dars testi',
        passing_score: Number(test.passing_score) || settings.passing_score,
        max_attempts: test.max_attempts ?? null,
        is_published: test.is_published !== false,
        created_at: test.created_at || new Date().toISOString(),
      };
      db.tests.push(created);
      return created;
    });
  },

  deleteTest(id: string): boolean {
    return mutate((db) => {
      const before = db.tests.length;
      db.tests = db.tests.filter((t) => t.id !== id);
      const questionIds = db.questions.filter((q) => q.test_id === id).map((q) => q.id);
      db.questions = db.questions.filter((q) => q.test_id !== id);
      db.answers = db.answers.filter((a) => !questionIds.includes(a.question_id));
      return db.tests.length < before;
    });
  },

  /** Questions with answers, ordered. Includes `is_correct` — server use only. */
  getTestQuestions(testId: string) {
    const db = loadDatabase();
    return db.questions
      .filter((q) => q.test_id === testId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((q) => ({
        ...q,
        answers: db.answers
          .filter((a) => a.question_id === q.id)
          .sort((x, y) => x.order_index - y.order_index),
      }));
  },

  /** Replace the whole question set of a test in one transaction. */
  replaceTestQuestions(
    testId: string,
    questions: { question: string; points?: number; multiple?: boolean; answers: { answer: string; is_correct: boolean }[] }[]
  ) {
    return mutate((db) => {
      const oldQuestionIds = db.questions.filter((q) => q.test_id === testId).map((q) => q.id);
      db.questions = db.questions.filter((q) => q.test_id !== testId);
      db.answers = db.answers.filter((a) => !oldQuestionIds.includes(a.question_id));

      questions.forEach((q, qi) => {
        const questionId = newId('qst');
        db.questions.push({
          id: questionId,
          test_id: testId,
          question: q.question,
          order_index: qi + 1,
          points: Number(q.points) || 1,
          multiple: q.multiple ?? false,
        });
        q.answers.forEach((a, ai) => {
          db.answers.push({
            id: newId('ans'),
            question_id: questionId,
            answer: a.answer,
            is_correct: Boolean(a.is_correct),
            order_index: ai + 1,
          });
        });
      });

      return db.questions.filter((q) => q.test_id === testId).length;
    });
  },

  // ── Enrollments ────────────────────────────────────────────────────────────
  getEnrollments(userId?: string): LocalEnrollment[] {
    const all = loadDatabase().enrollments || [];
    const now = Date.now();
    const updated = all.map((e) => {
      const expiresAtMs = e.expires_at
        ? new Date(e.expires_at).getTime()
        : e.purchased_at
          ? new Date(e.purchased_at).getTime() + 30 * 24 * 60 * 60 * 1000
          : 0;
      if (expiresAtMs > 0 && expiresAtMs <= now && e.status === 'active') {
        return { ...e, status: 'expired' as const };
      }
      return e;
    });
    if (!userId) return updated;
    return updated.filter((e) => e.user_id === userId);
  },

  saveEnrollment(enrollment: Partial<LocalEnrollment>): LocalEnrollment {
    return mutate((db) => {
      const idx = db.enrollments.findIndex(
        (e) => e.user_id === enrollment.user_id && e.course_id === enrollment.course_id
      );
      const now = new Date().toISOString();
      const defaultExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (idx >= 0) {
        db.enrollments[idx] = {
          ...db.enrollments[idx],
          ...enrollment,
          expires_at: enrollment.expires_at || db.enrollments[idx].expires_at || defaultExpires,
        } as LocalEnrollment;
        return db.enrollments[idx];
      }
      const created: LocalEnrollment = {
        id: enrollment.id || newId('enr'),
        user_id: enrollment.user_id || '',
        course_id: enrollment.course_id || '',
        status: enrollment.status || 'active',
        purchased_at: enrollment.purchased_at || now,
        expires_at: enrollment.expires_at || defaultExpires,
        plan_period: enrollment.plan_period || 'monthly',
        source: enrollment.source || 'payment',
        completed_at: enrollment.completed_at ?? null,
      };
      db.enrollments.push(created);
      return created;
    });
  },

  hasEnrollment(userId?: string | null, courseId?: string | null): boolean {
    if (!userId || !courseId) return false;
    const now = Date.now();
    return loadDatabase().enrollments.some((e) => {
      if (e.user_id !== userId || e.course_id !== courseId) return false;
      if (e.status !== 'active') return false;
      const expiresAtMs = e.expires_at
        ? new Date(e.expires_at).getTime()
        : e.purchased_at
          ? new Date(e.purchased_at).getTime() + 30 * 24 * 60 * 60 * 1000
          : 0;
      if (expiresAtMs > 0 && expiresAtMs <= now) {
        return false;
      }
      return true;
    });
  },

  revokeEnrollment(userId: string, courseId: string): boolean {
    return mutate((db) => {
      const e = db.enrollments.find((x) => x.user_id === userId && x.course_id === courseId);
      if (!e) return false;
      e.status = 'revoked';
      return true;
    });
  },

  // ── Lesson progress ────────────────────────────────────────────────────────
  getProgress(userId: string, lessonId?: string): LocalLessonProgress[] {
    const all = loadDatabase().lesson_progress.filter((p) => p.user_id === userId);
    return lessonId ? all.filter((p) => p.lesson_id === lessonId) : all;
  },

  getLessonProgress(userId: string, lessonId: string): LocalLessonProgress | null {
    return (
      loadDatabase().lesson_progress.find((p) => p.user_id === userId && p.lesson_id === lessonId) || null
    );
  },

  saveProgress(progress: Partial<LocalLessonProgress> & { user_id: string; lesson_id: string }): LocalLessonProgress {
    return mutate((db) => {
      const idx = db.lesson_progress.findIndex(
        (p) => p.user_id === progress.user_id && p.lesson_id === progress.lesson_id
      );
      const now = new Date().toISOString();
      if (idx >= 0) {
        const prev = db.lesson_progress[idx];
        db.lesson_progress[idx] = {
          ...prev,
          ...progress,
          // Watch progress only ever moves forward.
          watched_seconds: Math.max(prev.watched_seconds, progress.watched_seconds ?? 0),
          watch_percentage: Math.max(prev.watch_percentage, progress.watch_percentage ?? 0),
          video_completed: prev.video_completed || progress.video_completed || false,
          updated_at: now,
        };
        return db.lesson_progress[idx];
      }
      const created: LocalLessonProgress = {
        id: newId('prg'),
        user_id: progress.user_id,
        lesson_id: progress.lesson_id,
        watched_seconds: progress.watched_seconds ?? 0,
        watch_percentage: progress.watch_percentage ?? 0,
        video_completed: progress.video_completed ?? false,
        test_passed: progress.test_passed ?? false,
        test_score: progress.test_score ?? 0,
        xp_earned: progress.xp_earned ?? false,
        completed: progress.completed ?? false,
        completed_at: progress.completed_at ?? null,
        updated_at: now,
      };
      db.lesson_progress.push(created);
      return created;
    });
  },

  // ── Test attempts ──────────────────────────────────────────────────────────
  getAttempts(userId: string, testId?: string): LocalTestAttempt[] {
    const all = loadDatabase().test_attempts.filter((a) => a.user_id === userId);
    const list = testId ? all.filter((a) => a.test_id === testId) : all;
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getAllAttempts(): LocalTestAttempt[] {
    return loadDatabase().test_attempts;
  },

  saveAttempt(attempt: Omit<LocalTestAttempt, 'id' | 'created_at'>): LocalTestAttempt {
    return mutate((db) => {
      const created: LocalTestAttempt = {
        ...attempt,
        id: newId('att'),
        created_at: new Date().toISOString(),
      };
      db.test_attempts.push(created);
      return created;
    });
  },

  // ── XP ─────────────────────────────────────────────────────────────────────
  getXpTransactions(userId: string): LocalXpTransaction[] {
    return loadDatabase()
      .xp_transactions.filter((x) => x.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Award XP once per (user, source, reference). Returns the amount actually
   * granted — 0 when this reward was already collected.
   */
  awardXp(
    userId: string,
    amount: number,
    reason: string,
    source: LocalXpTransaction['source'],
    referenceId?: string | null
  ): { granted: number; totalXp: number } {
    return mutate((db) => {
      const profile = db.profiles.find((p) => p.id === userId);
      const already = referenceId
        ? db.xp_transactions.some(
            (x) => x.user_id === userId && x.source === source && x.reference_id === referenceId
          )
        : false;

      if (already || amount <= 0 || !profile) {
        return { granted: 0, totalXp: profile?.xp ?? 0 };
      }

      db.xp_transactions.push({
        id: newId('xp'),
        user_id: userId,
        amount,
        reason,
        source,
        reference_id: referenceId ?? null,
        created_at: new Date().toISOString(),
      });

      profile.xp = (profile.xp || 0) + amount;
      const thresholds = [...(db.settings?.level_thresholds || DEFAULT_SETTINGS.level_thresholds)].sort(
        (a, b) => b.xp - a.xp
      );
      profile.level = thresholds.find((t) => profile.xp >= t.xp)?.name || 'Beginner';

      return { granted: amount, totalXp: profile.xp };
    });
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  getPayments(userId?: string): LocalPayment[] {
    const db = loadDatabase();
    const coursesMap = new Map(db.courses.map((c) => [c.id, c]));
    const profilesMap = new Map(db.profiles.map((p) => [p.id, p]));

    return db.payments
      .filter((p) => !userId || p.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((p) => ({
        ...p,
        courses: coursesMap.get(p.course_id) || null,
        profiles: profilesMap.get(p.user_id) || null,
      }));
  },

  getPayment(idOrOrderId?: string | null): LocalPayment | null {
    if (!idOrOrderId) return null;
    const db = loadDatabase();
    const found = db.payments.find((p) => p.id === idOrOrderId || p.order_id === idOrOrderId);
    if (!found) return null;
    return {
      ...found,
      courses: db.courses.find((c) => c.id === found.course_id) || null,
      profiles: db.profiles.find((p) => p.id === found.user_id) || null,
    };
  },

  savePayment(paymentData: Partial<LocalPayment>): LocalPayment {
    return mutate((db) => {
      const idx = db.payments.findIndex(
        (p) =>
          (paymentData.id && p.id === paymentData.id) ||
          (paymentData.order_id && p.order_id === paymentData.order_id)
      );
      const now = new Date().toISOString();

      if (idx >= 0) {
        db.payments[idx] = { ...db.payments[idx], ...paymentData } as LocalPayment;
        return db.payments[idx];
      }

      const settings = { ...DEFAULT_SETTINGS, ...db.settings };
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const sequence = String(db.payments.length + 1).padStart(6, '0');

      const created: LocalPayment = {
        id: paymentData.id || newId('pay'),
        order_id: paymentData.order_id || `NE-${stamp}-${sequence}`,
        user_id: paymentData.user_id || '',
        course_id: paymentData.course_id || '',
        amount: Number(paymentData.amount) || 0,
        currency: paymentData.currency || settings.currency,
        provider: paymentData.provider || 'manual',
        status: paymentData.status || 'pending',
        first_name: paymentData.first_name,
        last_name: paymentData.last_name,
        phone: paymentData.phone,
        comment: paymentData.comment ?? null,
        receipt_url: paymentData.receipt_url ?? null,
        expires_at:
          paymentData.expires_at ||
          new Date(Date.now() + settings.payment_window_minutes * 60 * 1000).toISOString(),
        submitted_at: paymentData.submitted_at,
        created_at: paymentData.created_at || now,
      };
      db.payments.unshift(created);
      return created;
    });
  },

  approvePayment(idOrOrderId: string, approvedBy?: string): LocalPayment | null {
    return mutate((db) => {
      const p = db.payments.find((x) => x.id === idOrOrderId || x.order_id === idOrOrderId);
      if (!p) return null;
      if (p.status === 'approved') return p;

      const now = new Date().toISOString();
      p.status = 'approved';
      p.approved_at = now;
      p.paid_at = now;
      p.approved_by = approvedBy;

      const durationDays = (p as unknown as { period?: string }).period === 'daily' ? 1 : (p as unknown as { period?: string }).period === 'yearly' ? 365 : 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const existing = db.enrollments.find((e) => e.user_id === p.user_id && e.course_id === p.course_id);
      if (existing) {
        existing.status = 'active';
        existing.purchased_at = now;
        existing.expires_at = expiresAt;
        existing.plan_period = ((p as unknown as { period?: 'daily' | 'monthly' | 'yearly' }).period) || 'monthly';
      } else {
        db.enrollments.push({
          id: newId('enr'),
          user_id: p.user_id,
          course_id: p.course_id,
          status: 'active',
          purchased_at: now,
          expires_at: expiresAt,
          plan_period: ((p as unknown as { period?: 'daily' | 'monthly' | 'yearly' }).period) || 'monthly',
          source: 'payment',
          completed_at: null,
        });
      }
      return p;
    });
  },

  rejectPayment(idOrOrderId: string, reason: string, rejectedBy?: string): LocalPayment | null {
    return mutate((db) => {
      const p = db.payments.find((x) => x.id === idOrOrderId || x.order_id === idOrOrderId);
      if (!p) return null;
      p.status = 'rejected';
      p.rejected_at = new Date().toISOString();
      p.rejection_reason = reason;
      p.approved_by = rejectedBy;

      const enrollment = db.enrollments.find((e) => e.user_id === p.user_id && e.course_id === p.course_id);
      if (enrollment && enrollment.source === 'payment') enrollment.status = 'revoked';
      return p;
    });
  },

  cancelPayment(idOrOrderId: string): LocalPayment | null {
    return mutate((db) => {
      const p = db.payments.find((x) => x.id === idOrOrderId || x.order_id === idOrOrderId);
      if (!p || p.status === 'approved') return null;
      p.status = 'cancelled';
      p.cancelled_at = new Date().toISOString();
      return p;
    });
  },

  /** Flip every pending/unsubmitted order past its deadline to `expired`. */
  expireStalePayments(): number {
    return mutate((db) => {
      const now = Date.now();
      let count = 0;
      for (const p of db.payments) {
        if ((p.status === 'pending' || p.status === 'receipt_submitted') && p.expires_at) {
          // A submitted receipt is waiting on the admin, not on the user.
          if (p.status === 'receipt_submitted') continue;
          if (new Date(p.expires_at).getTime() < now) {
            p.status = 'expired';
            count++;
          }
        }
      }
      return count;
    });
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  getNotifications(userId: string): LocalNotification[] {
    return loadDatabase()
      .notifications.filter((n) => n.user_id === userId || n.user_id === 'all')
      .map((n) => {
        if (n.user_id === 'all') {
          const isRead = Array.isArray(n.read_by) ? n.read_by.includes(userId) : n.read;
          return { ...n, read: isRead };
        }
        return n;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addNotification(n: Omit<LocalNotification, 'id' | 'created_at' | 'read'> & { read?: boolean }): LocalNotification {
    return mutate((db) => {
      const created: LocalNotification = {
        id: newId('ntf'),
        user_id: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link ?? null,
        read: n.read ?? false,
        read_by: [],
        created_at: new Date().toISOString(),
      };
      db.notifications.unshift(created);
      return created;
    });
  },

  markNotificationRead(userId: string, notificationId?: string): number {
    return mutate((db) => {
      let count = 0;
      for (const n of db.notifications) {
        if (n.user_id !== userId && n.user_id !== 'all') continue;
        if (notificationId && n.id !== notificationId) continue;
        if (n.user_id === 'all') {
          if (!Array.isArray(n.read_by)) {
            n.read_by = [];
          }
          if (!n.read_by.includes(userId)) {
            n.read_by.push(userId);
            count++;
          }
        } else {
          if (!n.read) {
            n.read = true;
            count++;
          }
        }
      }
      return count;
    });
  },

  // ── Trading journal ────────────────────────────────────────────────────────
  getJournal(userId: string): LocalJournalTrade[] {
    return loadDatabase()
      .journals.filter((j) => j.user_id === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveJournalTrade(userId: string, trade: Partial<LocalJournalTrade>): LocalJournalTrade {
    return mutate((db) => {
      const pnl = Number(trade.pnl) || 0;
      const status: LocalJournalTrade['status'] = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';

      if (trade.id) {
        const idx = db.journals.findIndex((j) => j.id === trade.id && j.user_id === userId);
        if (idx >= 0) {
          db.journals[idx] = { ...db.journals[idx], ...trade, pnl, status, user_id: userId };
          return db.journals[idx];
        }
      }

      const created: LocalJournalTrade = {
        id: newId('trd'),
        user_id: userId,
        date: trade.date || new Date().toISOString().slice(0, 10),
        pair: trade.pair || 'EUR/USD',
        type: trade.type === 'SELL' ? 'SELL' : 'BUY',
        entryPrice: trade.entryPrice || '0',
        exitPrice: trade.exitPrice || '0',
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        pnl,
        rr: trade.rr || '',
        status,
        strategy: trade.strategy || '',
        screenshot_url: trade.screenshot_url ?? null,
        note: trade.note || '',
        created_at: new Date().toISOString(),
      };
      db.journals.unshift(created);
      return created;
    });
  },

  deleteJournalTrade(userId: string, tradeId: string): boolean {
    return mutate((db) => {
      const before = db.journals.length;
      db.journals = db.journals.filter((j) => !(j.id === tradeId && j.user_id === userId));
      return db.journals.length < before;
    });
  },

  // ── Backtests ──────────────────────────────────────────────────────────────
  getBacktests(userId: string): LocalBacktest[] {
    return loadDatabase()
      .backtests.filter((b) => b.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  saveBacktest(userId: string, bt: Partial<LocalBacktest>): LocalBacktest {
    return mutate((db) => {
      const totalTrades = Number(bt.totalTrades) || 0;
      const wins = Math.min(Number(bt.wins) || 0, totalTrades);
      const losses = Math.max(totalTrades - wins, 0);

      if (bt.id) {
        const idx = db.backtests.findIndex((b) => b.id === bt.id && b.user_id === userId);
        if (idx >= 0) {
          db.backtests[idx] = {
            ...db.backtests[idx],
            ...bt,
            totalTrades,
            wins,
            losses,
            winRate: totalTrades ? Math.round((wins / totalTrades) * 100) : 0,
            user_id: userId,
          };
          return db.backtests[idx];
        }
      }

      const created: LocalBacktest = {
        id: newId('bt'),
        user_id: userId,
        module_id: bt.module_id ?? null,
        name: bt.name || 'Backtest',
        instrument: bt.instrument || 'EUR/USD',
        timeframe: bt.timeframe || '15M',
        totalTrades,
        wins,
        losses,
        winRate: totalTrades ? Math.round((wins / totalTrades) * 100) : 0,
        rr: bt.rr || '',
        pnlPercent: Number(bt.pnlPercent) || 0,
        maxDD: bt.maxDD || '',
        profitFactor: bt.profitFactor || '',
        screenshot_url: bt.screenshot_url ?? null,
        notes: bt.notes || '',
        created_at: new Date().toISOString(),
      };
      db.backtests.unshift(created);
      return created;
    });
  },

  deleteBacktest(userId: string, id: string): boolean {
    return mutate((db) => {
      const before = db.backtests.length;
      db.backtests = db.backtests.filter((b) => !(b.id === id && b.user_id === userId));
      return db.backtests.length < before;
    });
  },

  // ── Certificates ───────────────────────────────────────────────────────────
  getCertificates(userId?: string): LocalCertificate[] {
    const all = loadDatabase().certificates;
    return userId ? all.filter((c) => c.user_id === userId) : all;
  },

  getCertificateById(certificateId: string): LocalCertificate | null {
    return (
      loadDatabase().certificates.find(
        (c) => c.certificate_id.toUpperCase() === certificateId.toUpperCase()
      ) || null
    );
  },

  issueCertificate(cert: Omit<LocalCertificate, 'id' | 'issued_at' | 'revoked'>): LocalCertificate {
    return mutate((db) => {
      const existing = db.certificates.find(
        (c) => c.user_id === cert.user_id && c.course_id === cert.course_id && !c.revoked
      );
      if (existing) return existing;

      const created: LocalCertificate = {
        ...cert,
        id: newId('cert'),
        issued_at: new Date().toISOString(),
        revoked: false,
      };
      db.certificates.push(created);
      return created;
    });
  },

  nextCertificateSequence(): number {
    return loadDatabase().certificates.length + 1;
  },

  // ── Risk disclaimer ────────────────────────────────────────────────────────
  getActiveDisclaimer(): LocalDisclaimerVersion {
    const db = loadDatabase();
    return db.disclaimer_versions.find((d) => d.is_active) || db.disclaimer_versions[0] || DEFAULT_DISCLAIMER;
  },

  getDisclaimerVersions(): LocalDisclaimerVersion[] {
    return loadDatabase().disclaimer_versions;
  },

  saveDisclaimerVersion(version: Partial<LocalDisclaimerVersion>): LocalDisclaimerVersion {
    return mutate((db) => {
      const idx = db.disclaimer_versions.findIndex((d) => d.id === version.id);
      if (idx >= 0) {
        db.disclaimer_versions[idx] = { ...db.disclaimer_versions[idx], ...version };
        if (version.is_active) {
          db.disclaimer_versions.forEach((d, i) => {
            if (i !== idx) d.is_active = false;
          });
        }
        return db.disclaimer_versions[idx];
      }
      db.disclaimer_versions.forEach((d) => (d.is_active = false));
      const created: LocalDisclaimerVersion = {
        id: newId('disc'),
        version: version.version || `${db.disclaimer_versions.length + 1}.0`,
        content: version.content || '',
        summary_points: version.summary_points || [],
        is_active: true,
        created_at: new Date().toISOString(),
      };
      db.disclaimer_versions.push(created);
      return created;
    });
  },

  recordDisclaimerAcceptance(a: Omit<LocalDisclaimerAcceptance, 'id' | 'accepted_at'>): LocalDisclaimerAcceptance {
    return mutate((db) => {
      const created: LocalDisclaimerAcceptance = {
        ...a,
        id: newId('acc'),
        accepted_at: new Date().toISOString(),
      };
      db.disclaimer_acceptances.push(created);
      return created;
    });
  },

  hasAcceptedDisclaimer(userId: string, version?: string): boolean {
    const active = version || localDb.getActiveDisclaimer().version;
    return loadDatabase().disclaimer_acceptances.some(
      (a) => a.user_id === userId && a.version === active
    );
  },

  getAcceptances(userId?: string): LocalDisclaimerAcceptance[] {
    const all = loadDatabase().disclaimer_acceptances;
    return userId ? all.filter((a) => a.user_id === userId) : all;
  },

  // ── Payment methods ────────────────────────────────────────────────────────
  getPaymentMethods(onlyEnabled = false): LocalPaymentMethod[] {
    const list = [...loadDatabase().payment_methods].sort((a, b) => a.order_index - b.order_index);
    return onlyEnabled ? list.filter((m) => m.enabled) : list;
  },

  savePaymentMethod(method: Partial<LocalPaymentMethod>): LocalPaymentMethod {
    return mutate((db) => {
      const idx = db.payment_methods.findIndex((m) => m.id === method.id);
      if (idx >= 0) {
        db.payment_methods[idx] = { ...db.payment_methods[idx], ...method } as LocalPaymentMethod;
        return db.payment_methods[idx];
      }
      const created: LocalPaymentMethod = {
        id: method.id || newId('pm'),
        name: method.name || 'Method',
        logo: method.logo || 'card',
        enabled: method.enabled !== false,
        supported: method.supported ?? false,
        order_index: method.order_index ?? db.payment_methods.length + 1,
      };
      db.payment_methods.push(created);
      return created;
    });
  },

  deletePaymentMethod(id: string): boolean {
    return mutate((db) => {
      const before = db.payment_methods.length;
      db.payment_methods = db.payment_methods.filter((m) => m.id !== id);
      return db.payment_methods.length < before;
    });
  },

  // ── Messages / support ─────────────────────────────────────────────────────
  getMessages(userId: string): LocalMessage[] {
    return loadDatabase()
      .messages.filter((m) => m.user_id === userId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  getAllMessageThreads(): { user_id: string; last: LocalMessage; unread: number }[] {
    const db = loadDatabase();
    const byUser = new Map<string, LocalMessage[]>();
    for (const m of db.messages) {
      if (!byUser.has(m.user_id)) byUser.set(m.user_id, []);
      byUser.get(m.user_id)!.push(m);
    }
    return [...byUser.entries()].map(([user_id, list]) => {
      const sorted = list.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return {
        user_id,
        last: sorted[sorted.length - 1],
        unread: sorted.filter((m) => m.sender === 'user' && !m.read).length,
      };
    });
  },

  saveMessage(msg: Omit<LocalMessage, 'id' | 'created_at' | 'read'> & { read?: boolean }): LocalMessage {
    return mutate((db) => {
      const created: LocalMessage = {
        id: newId('msg'),
        user_id: msg.user_id,
        sender: msg.sender,
        text: msg.text,
        read: msg.read ?? false,
        created_at: new Date().toISOString(),
      };
      db.messages.push(created);
      return created;
    });
  },

  // ── Reviews ────────────────────────────────────────────────────────────────
  getReviews(options: { approvedOnly?: boolean; courseId?: string } = {}): LocalReview[] {
    let list = loadDatabase().reviews;
    if (options.approvedOnly) list = list.filter((r) => r.approved);
    if (options.courseId) list = list.filter((r) => r.course_id === options.courseId);
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getUserReview(userId: string, courseId: string): LocalReview | null {
    return loadDatabase().reviews.find((r) => r.user_id === userId && r.course_id === courseId) || null;
  },

  saveReview(review: Partial<LocalReview> & { user_id: string; course_id: string }): LocalReview {
    return mutate((db) => {
      const idx = db.reviews.findIndex(
        (r) => r.id === review.id || (r.user_id === review.user_id && r.course_id === review.course_id)
      );
      if (idx >= 0) {
        db.reviews[idx] = { ...db.reviews[idx], ...review };
        return db.reviews[idx];
      }
      const created: LocalReview = {
        id: newId('rev'),
        user_id: review.user_id,
        course_id: review.course_id,
        author_name: review.author_name || 'Treyder',
        rating: Math.min(Math.max(Number(review.rating) || 5, 1), 5),
        content: review.content || '',
        // New reviews wait for moderation (TZ §22).
        approved: review.approved ?? false,
        created_at: new Date().toISOString(),
      };
      db.reviews.push(created);
      return created;
    });
  },

  setReviewApproval(id: string, approved: boolean): boolean {
    return mutate((db) => {
      const review = db.reviews.find((r) => r.id === id);
      if (!review) return false;
      review.approved = approved;
      return true;
    });
  },

  deleteReview(id: string): boolean {
    return mutate((db) => {
      const before = db.reviews.length;
      db.reviews = db.reviews.filter((r) => r.id !== id);
      return db.reviews.length < before;
    });
  },

  // ── FAQ ────────────────────────────────────────────────────────────────────
  getFaqs(publishedOnly = false): LocalFaq[] {
    const list = loadDatabase().faqs.filter((f) => !publishedOnly || f.published);
    return [...list].sort((a, b) => a.order_index - b.order_index);
  },

  saveFaq(faq: Partial<LocalFaq>): LocalFaq {
    return mutate((db) => {
      const idx = db.faqs.findIndex((f) => f.id === faq.id);
      if (idx >= 0) {
        db.faqs[idx] = { ...db.faqs[idx], ...faq } as LocalFaq;
        return db.faqs[idx];
      }
      const created: LocalFaq = {
        id: faq.id || newId('faq'),
        question_uz: faq.question_uz || '',
        question_ru: faq.question_ru,
        question_en: faq.question_en,
        answer_uz: faq.answer_uz || '',
        answer_ru: faq.answer_ru,
        answer_en: faq.answer_en,
        order_index: faq.order_index ?? db.faqs.length + 1,
        published: faq.published !== false,
      };
      db.faqs.push(created);
      return created;
    });
  },

  deleteFaq(id: string): boolean {
    return mutate((db) => {
      const before = db.faqs.length;
      db.faqs = db.faqs.filter((f) => f.id !== id);
      return db.faqs.length < before;
    });
  },

  // ── Activity log ───────────────────────────────────────────────────────────
  // ── Content translations (TZ §25) ──────────────────────────────────────────

  /** Every override for one entity kind, optionally narrowed to a locale. */
  getTranslations(entity?: LocalTranslation['entity'], locale?: 'ru' | 'en'): LocalTranslation[] {
    return loadDatabase().translations.filter(
      (t) => (!entity || t.entity === entity) && (!locale || t.locale === locale)
    );
  },

  getTranslation(
    entity: LocalTranslation['entity'],
    entityId: string,
    locale: 'ru' | 'en'
  ): LocalTranslation | null {
    return (
      loadDatabase().translations.find(
        (t) => t.entity === entity && t.entity_id === entityId && t.locale === locale
      ) || null
    );
  },

  saveTranslation(
    translation: Partial<LocalTranslation> & {
      entity: LocalTranslation['entity'];
      entity_id: string;
      locale: 'ru' | 'en';
    }
  ): LocalTranslation {
    return mutate((db) => {
      const idx = db.translations.findIndex(
        (t) =>
          t.entity === translation.entity &&
          t.entity_id === translation.entity_id &&
          t.locale === translation.locale
      );
      const now = new Date().toISOString();

      if (idx >= 0) {
        db.translations[idx] = { ...db.translations[idx], ...translation, updated_at: now };
        return db.translations[idx];
      }

      const created: LocalTranslation = {
        id: newId('trn'),
        entity: translation.entity,
        entity_id: translation.entity_id,
        locale: translation.locale,
        title: translation.title ?? null,
        short_description: translation.short_description ?? null,
        description: translation.description ?? null,
        summary: translation.summary ?? null,
        key_terms: translation.key_terms ?? null,
        updated_at: now,
      };
      db.translations.push(created);
      return created;
    });
  },

  deleteTranslation(entity: LocalTranslation['entity'], entityId: string, locale: 'ru' | 'en'): boolean {
    return mutate((db) => {
      const before = db.translations.length;
      db.translations = db.translations.filter(
        (t) => !(t.entity === entity && t.entity_id === entityId && t.locale === locale)
      );
      return db.translations.length < before;
    });
  },

  // ── Password resets (TZ §9) ────────────────────────────────────────────────

  /** Records a reset request awaiting admin approval. */
  createPasswordReset(userId: string, email: string): LocalPasswordReset {
    return mutate((db) => {
      const created: LocalPasswordReset = {
        id: newId('pwr'),
        user_id: userId,
        email: email.toLowerCase(),
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      db.password_resets.push(created);
      // Keep the log bounded; only recent requests are ever useful.
      if (db.password_resets.length > 200) {
        db.password_resets = db.password_resets.slice(-200);
      }
      return created;
    });
  },

  getPasswordReset(id: string): LocalPasswordReset | null {
    return loadDatabase().password_resets.find((r) => r.id === id) || null;
  },

  /** Attaches the hashed token once the admin approves the request. */
  approvePasswordReset(id: string, tokenHash: string, ttlMinutes: number): LocalPasswordReset | null {
    return mutate((db) => {
      const request = db.password_resets.find((r) => r.id === id);
      if (!request || request.status !== 'pending') return null;

      request.status = 'approved';
      request.token_hash = tokenHash;
      request.approved_at = new Date().toISOString();
      request.expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      return request;
    });
  },

  rejectPasswordReset(id: string): boolean {
    return mutate((db) => {
      const request = db.password_resets.find((r) => r.id === id);
      if (!request || request.status !== 'pending') return false;
      request.status = 'rejected';
      return true;
    });
  },

  /** Returns the matching approved, unexpired, unused request — or null. */
  findValidPasswordReset(tokenHash: string): LocalPasswordReset | null {
    const request = loadDatabase().password_resets.find(
      (r) => r.token_hash === tokenHash && r.status === 'approved'
    );
    if (!request) return null;
    if (!request.expires_at || new Date(request.expires_at).getTime() < Date.now()) return null;
    return request;
  },

  /** Burns the token so a reset link works exactly once. */
  consumePasswordReset(id: string): boolean {
    return mutate((db) => {
      const request = db.password_resets.find((r) => r.id === id);
      if (!request || request.status !== 'approved') return false;
      request.status = 'used';
      request.used_at = new Date().toISOString();
      request.token_hash = null;
      return true;
    });
  },

  logActivity(userId: string, action: string, metadata?: Record<string, unknown>) {
    mutate((db) => {
      db.activity_logs.unshift({
        id: newId('log'),
        user_id: userId,
        action,
        metadata,
        created_at: new Date().toISOString(),
      });
      if (db.activity_logs.length > 5000) db.activity_logs = db.activity_logs.slice(0, 5000);
    });
  },

  getActivity(userId?: string, limit = 50): LocalActivityLog[] {
    const all = loadDatabase().activity_logs;
    return (userId ? all.filter((l) => l.user_id === userId) : all).slice(0, limit);
  },

  // ── Aggregates ─────────────────────────────────────────────────────────────
  getStats() {
    const db = loadDatabase();
    const approved = db.payments.filter((p) => p.status === 'approved');
    const pending = db.payments.filter((p) => p.status === 'receipt_submitted');
    const rejected = db.payments.filter((p) => p.status === 'rejected');
    const students = db.profiles.filter((p) => p.role === 'student');
    const paidUserIds = new Set(approved.map((p) => p.user_id));
    const attempts = db.test_attempts;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    return {
      totalUsers: students.length,
      totalProfiles: db.profiles.length,
      totalRevenue: approved.reduce((sum, p) => sum + (p.amount || 0), 0),
      pendingReceiptsCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      courseCount: db.courses.length,
      moduleCount: db.modules.length,
      lessonCount: db.lessons.length,
      paidUsersCount: paidUserIds.size,
      registeredOnlyCount: Math.max(0, students.length - paidUserIds.size),
      activeUsersCount: db.profiles.filter(
        (p) => p.last_active_at && new Date(p.last_active_at).getTime() > dayAgo
      ).length,
      testAttempts: attempts.length,
      testPassRate: attempts.length
        ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
        : 0,
      certificatesIssued: db.certificates.filter((c) => !c.revoked).length,
      completedLessons: db.lesson_progress.filter((p) => p.completed).length,
    };
  },

  /** Removes every account except the master admin. Destructive; admin-only. */
  resetUsersToAdminOnly(): LocalProfile[] {
    return mutate((db) => {
      const admin = db.profiles.find((p) => p.email?.toLowerCase() === MASTER_ADMIN_EMAIL);
      const keepId = admin?.id;
      db.profiles = admin ? [admin] : [];
      db.enrollments = db.enrollments.filter((e) => e.user_id === keepId);
      db.payments = db.payments.filter((p) => p.user_id === keepId);
      db.lesson_progress = db.lesson_progress.filter((p) => p.user_id === keepId);
      db.test_attempts = db.test_attempts.filter((a) => a.user_id === keepId);
      db.xp_transactions = db.xp_transactions.filter((x) => x.user_id === keepId);
      db.notifications = db.notifications.filter((n) => n.user_id === keepId);
      db.journals = db.journals.filter((j) => j.user_id === keepId);
      db.backtests = db.backtests.filter((b) => b.user_id === keepId);
      db.certificates = db.certificates.filter((c) => c.user_id === keepId);
      db.messages = db.messages.filter((m) => m.user_id === keepId);
      db.disclaimer_acceptances = db.disclaimer_acceptances.filter((a) => a.user_id === keepId);
      db.reviews = db.reviews.filter((r) => r.user_id === keepId);
      return db.profiles;
    });
  },

  /** Replace the catalogue (courses + modules + lessons) with a seed set. */
  seedCatalog(seed: { courses: LocalCourse[]; modules: LocalModule[]; lessons: LocalLesson[] }) {
    return mutate((db) => {
      const existingLessonIds = new Set(db.lessons.map((l) => l.id));

      for (const c of seed.courses) {
        const idx = db.courses.findIndex((x) => x.id === c.id);
        if (idx >= 0) {
          // Keep admin edits to price/title, only fill in what is missing.
          db.courses[idx] = { ...c, ...db.courses[idx] };
        } else {
          db.courses.push(c);
        }
      }
      for (const m of seed.modules) {
        if (!db.modules.some((x) => x.id === m.id)) db.modules.push(m);
      }
      for (const l of seed.lessons) {
        if (!existingLessonIds.has(l.id)) db.lessons.push(l);
      }
      return {
        courses: db.courses.length,
        modules: db.modules.length,
        lessons: db.lessons.length,
      };
    });
  },
};

export type { LocalDatabase };
