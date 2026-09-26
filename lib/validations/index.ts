import { z } from 'zod';

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'Ism kamida 2 ta belgidan iborat bo‘lishi kerak'),
  lastName: z.string().min(2, 'Familiya kamida 2 ta belgidan iborat bo‘lishi kerak'),
  phone: z.string().min(7, 'Telefon raqam kiritilishi shart'),
  email: z.string().email('Noto‘g‘ri email formati').min(1, 'Email kiritilishi shart'),
  password: z
    .string()
    .min(8, 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak')
    .regex(/[a-zA-Z]/, 'Parolda kamida bitta harf bo‘lishi kerak')
    .regex(/[0-9]/, 'Parolda kamida bitta raqam bo‘lishi kerak'),
  confirmPassword: z.string().min(1, 'Iltimos, parolni tasdiqlang'),
  acceptDisclaimer: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Parollar mos kelmadi',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================
// Profile Schemas
// ============================================================

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Ism kamida 2 ta belgidan iborat bo‘lishi kerak'),
  phone: z.string().min(7, 'Telefon raqam noto‘g‘ri').optional().nullable(),
  language: z.enum(['uz', 'ru', 'en']).optional().nullable(),
  theme: z.enum(['dark', 'light']).optional().nullable(),
  avatar_url: z.string().optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================
// Course Admin Schemas
// ============================================================

export const courseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Kurs nomi kerak'),
  slug: z
    .string()
    .min(1, 'Slug kerak')
    .regex(/^[a-z0-9-]+$/, 'Slug faqat kichik harf, raqam va defisdan iborat bo‘lishi kerak'),
  description: z.string().optional(),
  short_description: z.string().optional(),
  level: z.string().min(1),
  price: z.coerce.number().min(0, 'Narx manfiy bo‘lishi mumkin emas'),
  currency: z.string().default('UZS'),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  thumbnail_url: z.string().optional().nullable(),
  order_index: z.coerce.number().optional(),
});

export const moduleSchema = z.object({
  id: z.string().optional(),
  course_id: z.string().min(1, 'Kurs tanlanishi kerak'),
  title: z.string().min(1, 'Modul nomi kerak'),
  description: z.string().optional().nullable(),
  order_index: z.coerce.number().min(0),
  icon: z.string().optional().nullable(),
  is_published: z.boolean().default(true),
  requires_backtest: z.boolean().default(false),
  requires_journal: z.boolean().default(false),
});

export const lessonSchema = z.object({
  id: z.string().optional(),
  module_id: z.string().min(1, 'Modul tanlanishi kerak'),
  title: z.string().min(1, 'Dars nomi kerak'),
  short_description: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  key_terms: z
    .array(z.object({ term: z.string().min(1), definition: z.string().min(1) }))
    .optional()
    .default([]),
  materials: z
    .array(z.object({ title: z.string().min(1), url: z.string().min(1), type: z.string().optional() }))
    .optional()
    .default([]),
  video_url: z.string().min(1, 'Video yuklanishi yoki havola kiritilishi kerak'),
  video_provider: z.string().optional(),
  duration: z.coerce.number().min(0).default(0),
  order_index: z.coerce.number().min(0),
  xp_reward: z.coerce.number().min(0).default(50),
  watch_requirement: z.coerce.number().min(1).max(100).default(90),
  is_published: z.boolean().default(true),
  preview_enabled: z.boolean().default(false),
  allow_seeking: z.boolean().default(false),
});

// ============================================================
// Test Admin Schemas
// ============================================================

export const testSchema = z.object({
  title: z.string().min(1, 'Test nomi kerak'),
  lesson_id: z.string().min(1, 'Dars tanlanishi kerak'),
  passing_score: z.number().min(1).max(100).default(90),
  max_attempts: z.number().min(1).nullable().optional(),
  is_published: z.boolean().default(true),
  questions: z
    .array(
      z.object({
        question: z.string().min(1, 'Savol matni kerak'),
        points: z.number().min(1).default(1),
        multiple: z.boolean().default(false),
        answers: z
          .array(
            z.object({
              answer: z.string().min(1, 'Javob matni kerak'),
              is_correct: z.boolean().default(false),
            })
          )
          .min(2, 'Kamida 2 ta javob varianti kerak'),
      })
    )
    .min(1, 'Kamida 1 ta savol kerak')
    .refine(
      (questions) => questions.every((q) => q.answers.some((a) => a.is_correct)),
      'Har bir savolda kamida bitta to‘g‘ri javob belgilanishi kerak'
    ),
});

export const questionSchema = z.object({
  question: z.string().min(1, 'Question text is required'),
  order_index: z.number().min(0),
});

export const answerSchema = z.object({
  answer: z.string().min(1, 'Answer text is required'),
  is_correct: z.boolean().default(false),
});

// ============================================================
// Test Submission Schema
// ============================================================

export const testSubmissionSchema = z.object({
  testId: z.string().min(1, 'Test ID kerak'),
  answers: z.record(z.string().min(1), z.string().min(1)),
});

// ============================================================
// Payment Schemas
// ============================================================

export const paymentCreateSchema = z.object({
  courseId: z.string().min(1, 'Kurs tanlanishi kerak'),
  provider: z.string().default('manual'),
  period: z.enum(['daily', 'monthly', 'yearly']).optional().default('monthly'),
});

export const receiptSubmissionSchema = z.object({
  paymentId: z.string().min(1, 'To‘lov ID kerak'),
  firstName: z.string().min(2, 'Ismni kiriting'),
  lastName: z.string().min(2, 'Familiyani kiriting'),
  phone: z.string().min(7, 'Telefon raqamni kiriting'),
  receiptUrl: z.string().min(1, 'Chek skrinshotini yuklang'),
  comment: z.string().max(500, 'Izoh juda uzun').optional().nullable(),
});

export const paymentApprovalSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
});

export const paymentRejectionSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(1, 'Rejection reason is required'),
});

// ============================================================
// Review Schema
// ============================================================

export const reviewSchema = z.object({
  course_id: z.string().min(1),
  rating: z.coerce.number().min(1).max(5),
  content: z.string().min(10, 'Sharh kamida 10 ta belgidan iborat bo‘lishi kerak'),
});

// ============================================================
// Journal / Backtest Schemas
// ============================================================

export const journalTradeSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, 'Sanani tanlang'),
  pair: z.string().min(1, 'Instrumentni kiriting'),
  type: z.enum(['BUY', 'SELL']),
  entryPrice: z.string().min(1, 'Entry narxini kiriting'),
  exitPrice: z.string().min(1, 'Chiqish narxini kiriting'),
  stopLoss: z.string().optional(),
  takeProfit: z.string().optional(),
  pnl: z.coerce.number(),
  rr: z.string().optional().default(''),
  strategy: z.string().optional().default(''),
  screenshot_url: z.string().optional().nullable(),
  note: z.string().max(1000).optional().default(''),
});

export const backtestSchema = z.object({
  id: z.string().optional(),
  module_id: z.string().optional().nullable(),
  name: z.string().min(1, 'Backtest nomini kiriting'),
  instrument: z.string().min(1, 'Instrumentni kiriting'),
  timeframe: z.string().min(1, 'Timeframe tanlang'),
  totalTrades: z.coerce.number().min(1, 'Savdolar soni kamida 1 bo‘lishi kerak'),
  wins: z.coerce.number().min(0),
  rr: z.string().optional().default(''),
  pnlPercent: z.coerce.number().default(0),
  maxDD: z.string().optional().default(''),
  profitFactor: z.string().optional().default(''),
  screenshot_url: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().default(''),
}).refine((d) => d.wins <= d.totalTrades, {
  message: 'G‘alabalar soni umumiy savdolardan ko‘p bo‘lishi mumkin emas',
  path: ['wins'],
});

export const messageSchema = z.object({
  text: z.string().min(1, 'Xabar matnini kiriting').max(2000, 'Xabar juda uzun'),
});

export const adminSettingsSchema = z.object({
  passing_score: z.coerce.number().min(1).max(100).optional(),
  watch_requirement: z.coerce.number().min(1).max(100).optional(),
  xp_lesson: z.coerce.number().min(0).optional(),
  xp_test: z.coerce.number().min(0).optional(),
  xp_module: z.coerce.number().min(0).optional(),
  xp_course: z.coerce.number().min(0).optional(),
  payment_window_minutes: z.coerce.number().min(1).max(180).optional(),
  currency: z.string().optional(),
  support_telegram: z.string().optional(),
  support_email: z.string().optional(),
  payment_instructions: z.string().optional(),
  card_number: z.string().optional(),
  card_holder: z.string().optional(),
  instagram_url: z.string().optional(),
  telegram_channel_url: z.string().optional(),
  youtube_url: z.string().optional(),
  course_limit_days: z.coerce.number().min(1).optional(),
  cards: z
    .array(
      z.object({
        id: z.string().default(() => 'card_' + Math.random().toString(36).slice(2, 8)),
        type: z.string(),
        number: z.string(),
        raw_number: z.string().default(''),
        holder: z.string(),
        is_primary: z.boolean().optional(),
      })
    )
    .optional(),
  level_thresholds: z.array(z.object({ name: z.string(), xp: z.coerce.number().min(0) })).optional(),
});

export const paymentMethodSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nomi kerak'),
  logo: z.string().min(1),
  enabled: z.boolean().default(true),
  supported: z.boolean().default(false),
  order_index: z.coerce.number().min(0).default(0),
});

export const disclaimerSchema = z.object({
  id: z.string().optional(),
  version: z.string().min(1, 'Versiya kerak'),
  content: z.string().min(20, 'Matn juda qisqa'),
  summary_points: z.array(z.string().min(1)).min(1, 'Kamida bitta band kerak'),
  is_active: z.boolean().default(true),
});

export const broadcastSchema = z.object({
  title: z.string().min(1, 'Sarlavha kerak'),
  message: z.string().min(1, 'Xabar matni kerak'),
  type: z.string().default('announcement'),
  link: z.string().optional().nullable(),
  target: z.enum(['all', 'user']).default('all'),
  userId: z.string().optional(),
});

export const translationSchema = z.object({
  entity: z.enum(['course', 'module', 'lesson']),
  entity_id: z.string().min(1, 'Element tanlanishi kerak'),
  locale: z.enum(['ru', 'en']),
  title: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  key_terms: z
    .array(z.object({ term: z.string().min(1), definition: z.string().min(1) }))
    .optional()
    .nullable(),
});

// ============================================================
// FAQ Schema
// ============================================================

export const faqSchema = z.object({
  question_uz: z.string().min(1, 'Uzbek question is required'),
  question_ru: z.string().optional(),
  question_en: z.string().optional(),
  answer_uz: z.string().min(1, 'Uzbek answer is required'),
  answer_ru: z.string().optional(),
  answer_en: z.string().optional(),
  order_index: z.number().default(0),
  published: z.boolean().default(true),
});

// ============================================================
// Video Progress Schema
// ============================================================

export const videoProgressSchema = z.object({
  lessonId: z.string().min(1, 'Dars ID kerak'),
  watchedSeconds: z.number().min(0),
  duration: z.number().min(1),
});

// ============================================================
// Type Exports
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
export type TestInput = z.infer<typeof testSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
export type TestSubmissionInput = z.infer<typeof testSubmissionSchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type FAQInput = z.infer<typeof faqSchema>;
export type TranslationInput = z.infer<typeof translationSchema>;
export type VideoProgressInput = z.infer<typeof videoProgressSchema>;
export type JournalTradeInput = z.infer<typeof journalTradeSchema>;
export type BacktestInput = z.infer<typeof backtestSchema>;
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
export type DisclaimerInput = z.infer<typeof disclaimerSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
export type ReceiptSubmissionInput = z.infer<typeof receiptSubmissionSchema>;
export type PaymentRejectionInput = z.infer<typeof paymentRejectionSchema>;
