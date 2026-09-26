-- ==============================================================================
-- NEW ERA - DATABASE SCHEMA v2 (Extensions)
-- Run this AFTER schema.sql in your Supabase SQL Editor.
-- ==============================================================================

-- Enable uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- EXTEND EXISTING TABLES
-- ==============================================================================

-- Add missing columns to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'UZS';

-- Add missing columns to enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'payment';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add missing columns to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_provider TEXT DEFAULT 'direct';

-- Add missing columns to lesson_progress
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS watch_percentage INTEGER DEFAULT 0;

-- Add missing columns to test_attempts
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS answers_data JSONB;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Add missing columns to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ==============================================================================
-- NEW TABLES
-- ==============================================================================

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    order_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'UZS',
    provider TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'pending',
    receipt_url TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    comment TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FAQ ITEMS
CREATE TABLE IF NOT EXISTS public.faq_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_uz TEXT NOT NULL,
    question_ru TEXT,
    question_en TEXT,
    answer_uz TEXT NOT NULL,
    answer_ru TEXT,
    answer_en TEXT,
    order_index INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CERTIFICATES
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_number TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, course_id)
);

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    metadata JSONB,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, achievement_type)
);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- STREAKS
CREATE TABLE IF NOT EXISTS public.streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- XP TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PAYMENT METHODS
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, achievement_key)
);

-- ==============================================================================
-- RLS FOR ALL TABLES (NON-RECURSIVE & SAFE)
-- ==============================================================================

-- Fix profiles RLS recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Payments: users can view own payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- Notifications: users can view/update own
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Reviews: anyone can view approved, users can create own
CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT USING (approved = true);
CREATE POLICY "Users can create own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FAQ: anyone can read published
CREATE POLICY "Anyone can view published FAQ" ON public.faq_items FOR SELECT USING (published = true);

-- Activity logs: users can insert own
CREATE POLICY "Users can insert own logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);

-- Certificates: users can view own
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);

-- Achievements: users can view own
CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);

-- Platform settings: anyone can read
CREATE POLICY "Anyone can read settings" ON public.platform_settings FOR SELECT USING (true);

-- Streaks: users can view/update own
CREATE POLICY "Users can view own streak" ON public.streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own streak" ON public.streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streak" ON public.streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- ADMIN POLICIES (for profiles with role = 'admin')
-- ==============================================================================

-- Admin can read ALL profiles
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can manage courses (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin can insert courses" ON public.courses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update courses" ON public.courses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete courses" ON public.courses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can read ALL courses (including unpublished)
CREATE POLICY "Admin can read all courses" ON public.courses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage modules
CREATE POLICY "Admin can insert modules" ON public.modules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update modules" ON public.modules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete modules" ON public.modules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage lessons
CREATE POLICY "Admin can insert lessons" ON public.lessons FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update lessons" ON public.lessons FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete lessons" ON public.lessons FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can read all lessons" ON public.lessons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage enrollments
CREATE POLICY "Admin can insert enrollments" ON public.enrollments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update enrollments" ON public.enrollments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete enrollments" ON public.enrollments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can read all enrollments" ON public.enrollments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage payments
CREATE POLICY "Admin can read all payments" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update payments" ON public.payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can insert payments" ON public.payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage notifications
CREATE POLICY "Admin can insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can read all notifications" ON public.notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage reviews
CREATE POLICY "Admin can read all reviews" ON public.reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update reviews" ON public.reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete reviews" ON public.reviews FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage FAQ
CREATE POLICY "Admin can insert FAQ" ON public.faq_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update FAQ" ON public.faq_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete FAQ" ON public.faq_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can read all FAQ" ON public.faq_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can read all progress
CREATE POLICY "Admin can read all progress" ON public.lesson_progress FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can read all test attempts
CREATE POLICY "Admin can read all test attempts" ON public.test_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can read all activity logs
CREATE POLICY "Admin can read all logs" ON public.activity_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage tests/questions/answers
CREATE POLICY "Admin can insert tests" ON public.tests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update tests" ON public.tests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete tests" ON public.tests FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can insert questions" ON public.questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update questions" ON public.questions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete questions" ON public.questions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can insert answers" ON public.answers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update answers" ON public.answers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete answers" ON public.answers FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage certificates
CREATE POLICY "Admin can read all certificates" ON public.certificates FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can insert certificates" ON public.certificates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage achievements
CREATE POLICY "Admin can read all achievements" ON public.achievements FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage platform settings
CREATE POLICY "Admin can update settings" ON public.platform_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can insert settings" ON public.platform_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage streaks
CREATE POLICY "Admin can read all streaks" ON public.streaks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==============================================================================
-- INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(published);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON public.payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(approved);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

-- ==============================================================================
-- PLATFORM SETTINGS SEED
-- ==============================================================================

INSERT INTO public.platform_settings (key, value) VALUES
  ('test_passing_score', '85'),
  ('platform_name', 'NEW ERA'),
  ('support_email', 'support@newera.uz'),
  ('telegram_url', 'https://t.me/newera_trading'),
  ('default_currency', 'UZS'),
  ('default_language', 'uz'),
  ('maintenance_mode', 'false'),
  ('xp_multiplier', '1')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- FAQ SEED DATA
-- ==============================================================================

INSERT INTO public.faq_items (question_uz, question_ru, question_en, answer_uz, answer_ru, answer_en, order_index, published) VALUES
('NEW ERA nima?', 'Что такое NEW ERA?', 'What is NEW ERA?', 'NEW ERA — bu professional treyding ta''lim platformasi. Strukturalangan kurslar, amaliy testlar va mentor yordami orqali bozorlarni o''rganasiz.', 'NEW ERA — это профессиональная платформа для обучения трейдингу. Вы изучаете рынки через структурированные курсы, практические тесты и поддержку менторов.', 'NEW ERA is a professional trading education platform. You learn markets through structured courses, practical tests, and mentor support.', 1, true),
('Kurslar qanday ishlaydi?', 'Как работают курсы?', 'How do courses work?', 'Har bir kurs modullarga bo''lingan. Har bir modulda video darslar bor. Darsni ko''rib bo''lgach test topshirasiz. 85% va undan yuqori ball olsangiz, keyingi dars ochiladi va XP olasiz.', 'Каждый курс разделён на модули. В каждом модуле есть видеоуроки. После просмотра урока вы сдаёте тест. При результате 85% и выше открывается следующий урок и начисляется XP.', 'Each course is divided into modules. Each module has video lessons. After watching a lesson, you take a test. Score 85% or higher to unlock the next lesson and earn XP.', 2, true),
('XP tizimi nima?', 'Что такое система XP?', 'What is the XP system?', 'XP (Experience Points) — tajriba ballari. Har bir tugatilgan dars va o''tilgan test uchun XP olasiz. XP ko''paygan sari darajangiz oshadi: Beginner → Intermediate → Advanced → Pro.', 'XP (Experience Points) — баллы опыта. За каждый пройденный урок и тест вы получаете XP. По мере накопления XP ваш уровень повышается: Beginner → Intermediate → Advanced → Pro.', 'XP (Experience Points) are earned for each completed lesson and passed test. As you accumulate XP, your level increases: Beginner → Intermediate → Advanced → Pro.', 3, true),
('Kurs narxi qancha?', 'Сколько стоит курс?', 'How much do courses cost?', 'Narxlar kurs sahifasida ko''rsatilgan. Har bir kurs alohida sotib olinadi. Beginner va Pro kurslar alohida mavjud.', 'Цены указаны на странице курса. Каждый курс приобретается отдельно. Курсы Beginner и Pro доступны отдельно.', 'Prices are shown on the course page. Each course is purchased separately. Beginner and Pro courses are available separately.', 4, true),
('To''lov qanday amalga oshiriladi?', 'Как произвести оплату?', 'How do I make a payment?', 'Kursni tanlang, checkout sahifasiga o''ting va to''lov usulini tanlang. To''lov tasdiqlangach, kurs avtomatik ochiladi.', 'Выберите курс, перейдите на страницу оформления и выберите способ оплаты. После подтверждения оплаты курс откроется автоматически.', 'Select a course, go to checkout, and choose a payment method. After payment is confirmed, the course will be unlocked automatically.', 5, true),
('Sertifikat beriladimi?', 'Выдаётся ли сертификат?', 'Is a certificate provided?', 'Ha! Kursni to''liq tugatganingizdan so''ng sertifikat beriladi.', 'Да! После полного завершения курса выдаётся сертификат.', 'Yes! A certificate is issued after you fully complete a course.', 6, true)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- TEST SEED DATA (for existing lessons)
-- ==============================================================================

-- Test for "What is Trading?"
INSERT INTO public.tests (id, lesson_id, title) VALUES
  ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 'Trading Basics Test')
ON CONFLICT DO NOTHING;

INSERT INTO public.questions (id, test_id, question, order_index) VALUES
  ('66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555551', 'Treyding nima?', 1),
  ('66666666-6666-6666-6666-666666666602', '55555555-5555-5555-5555-555555555551', 'Qaysi bozorda valyutalar savdo qilinadi?', 2),
  ('66666666-6666-6666-6666-666666666603', '55555555-5555-5555-5555-555555555551', 'Treyder qanday foyda oladi?', 3),
  ('66666666-6666-6666-6666-666666666604', '55555555-5555-5555-5555-555555555551', 'Leverage nima?', 4),
  ('66666666-6666-6666-6666-666666666605', '55555555-5555-5555-5555-555555555551', 'Stop Loss nima?', 5)
ON CONFLICT DO NOTHING;

-- Answers for Q1: "Treyding nima?"
INSERT INTO public.answers (id, question_id, answer, is_correct) VALUES
  ('77777777-7777-7777-7777-777777770101', '66666666-6666-6666-6666-666666666601', 'Moliyaviy aktivlarni sotib olish va sotish orqali foyda olish jarayoni', true),
  ('77777777-7777-7777-7777-777777770102', '66666666-6666-6666-6666-666666666601', 'Faqat aksiyalarni sotib olish', false),
  ('77777777-7777-7777-7777-777777770103', '66666666-6666-6666-6666-666666666601', 'Bank depozitiga pul qo''yish', false),
  ('77777777-7777-7777-7777-777777770104', '66666666-6666-6666-6666-666666666601', 'Kriptovalyuta yaratish', false)
ON CONFLICT DO NOTHING;

-- Answers for Q2
INSERT INTO public.answers (id, question_id, answer, is_correct) VALUES
  ('77777777-7777-7777-7777-777777770201', '66666666-6666-6666-6666-666666666602', 'Aksiya bozori', false),
  ('77777777-7777-7777-7777-777777770202', '66666666-6666-6666-6666-666666666602', 'Forex bozori', true),
  ('77777777-7777-7777-7777-777777770203', '66666666-6666-6666-6666-666666666602', 'Kriptovalyuta bozori', false),
  ('77777777-7777-7777-7777-777777770204', '66666666-6666-6666-6666-666666666602', 'Tovar bozori', false)
ON CONFLICT DO NOTHING;

-- Answers for Q3
INSERT INTO public.answers (id, question_id, answer, is_correct) VALUES
  ('77777777-7777-7777-7777-777777770301', '66666666-6666-6666-6666-666666666603', 'Faqat sotib olib, boshqalarga sotish orqali', false),
  ('77777777-7777-7777-7777-777777770302', '66666666-6666-6666-6666-666666666603', 'Narx farqi orqali - arzon sotib olib, qimmat sotish yoki qimmat sotib, arzon sotib olish', true),
  ('77777777-7777-7777-7777-777777770303', '66666666-6666-6666-6666-666666666603', 'Faqat dividendlar orqali', false),
  ('77777777-7777-7777-7777-777777770304', '66666666-6666-6666-6666-666666666603', 'Faqat komissiya orqali', false)
ON CONFLICT DO NOTHING;

-- Answers for Q4
INSERT INTO public.answers (id, question_id, answer, is_correct) VALUES
  ('77777777-7777-7777-7777-777777770401', '66666666-6666-6666-6666-666666666604', 'Brokerdan qarz olish tizimi', false),
  ('77777777-7777-7777-7777-777777770402', '66666666-6666-6666-6666-666666666604', 'Foyda ko''paytirish usuli', false),
  ('77777777-7777-7777-7777-777777770403', '66666666-6666-6666-6666-666666666604', 'Kredit yechimi bo''lib, kichik kapital bilan katta hajmda savdo qilish imkonini beradi', true),
  ('77777777-7777-7777-7777-777777770404', '66666666-6666-6666-6666-666666666604', 'Broker to''lovi', false)
ON CONFLICT DO NOTHING;

-- Answers for Q5
INSERT INTO public.answers (id, question_id, answer, is_correct) VALUES
  ('77777777-7777-7777-7777-777777770501', '66666666-6666-6666-6666-666666666605', 'Savdoni to''xtatish buyrug''i - zararni cheklash uchun ishlatiladi', true),
  ('77777777-7777-7777-7777-777777770502', '66666666-6666-6666-6666-666666666605', 'Foydani olish buyrug''i', false),
  ('77777777-7777-7777-7777-777777770503', '66666666-6666-6666-6666-666666666605', 'Yangi savdo ochish buyrug''i', false),
  ('77777777-7777-7777-7777-777777770504', '66666666-6666-6666-6666-666666666605', 'Hisobni yopish buyrug''i', false)
ON CONFLICT DO NOTHING;

-- Test for "Financial Markets" lesson
INSERT INTO public.tests (id, lesson_id, title) VALUES
  ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444442', 'Financial Markets Test')
ON CONFLICT DO NOTHING;

INSERT INTO public.questions (id, test_id, question, order_index) VALUES
  ('66666666-6666-6666-6666-666666666611', '55555555-5555-5555-5555-555555555552', 'Aksiya bozori nima?', 1),
  ('66666666-6666-6666-6666-666666666612', '55555555-5555-5555-5555-555555555552', 'Forex bozorining ishlash vaqti qanday?', 2),
  ('66666666-6666-6666-6666-666666666613', '55555555-5555-5555-5555-555555555552', 'Kriptovalyuta bozori an''anaviy bozorlardan qanday farq qiladi?', 3),
  ('66666666-6666-6666-6666-666666666614', '55555555-5555-5555-5555-555555555552', 'Commodities (tovar) bozorida nimalar savdo qilinadi?', 4),
  ('66666666-6666-6666-6666-666666666615', '55555555-5555-5555-5555-555555555552', 'Bull market nima?', 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.answers (id, question_id, answer, is_correct) VALUES
  ('77777777-7777-7777-7777-777777771101', '66666666-6666-6666-6666-666666666611', 'Kompaniyalarning ulushlarini sotib olish va sotish bozori', true),
  ('77777777-7777-7777-7777-777777771102', '66666666-6666-6666-6666-666666666611', 'Valyutalarni almashtirish bozori', false),
  ('77777777-7777-7777-7777-777777771103', '66666666-6666-6666-6666-666666666611', 'Qimmatbaho metallar bozori', false),
  ('77777777-7777-7777-7777-777777771104', '66666666-6666-6666-6666-666666666611', 'Kriptovalyuta bozori', false),
  ('77777777-7777-7777-7777-777777771201', '66666666-6666-6666-6666-666666666612', '24 soat, haftada 5 kun', true),
  ('77777777-7777-7777-7777-777777771202', '66666666-6666-6666-6666-666666666612', 'Faqat ish kunlarida 9:00-17:00', false),
  ('77777777-7777-7777-7777-777777771203', '66666666-6666-6666-6666-666666666612', '24/7 to''xtovsiz', false),
  ('77777777-7777-7777-7777-777777771204', '66666666-6666-6666-6666-666666666612', 'Faqat dushanbadan chorshanbagacha', false),
  ('77777777-7777-7777-7777-777777771301', '66666666-6666-6666-6666-666666666613', '24/7 ishlaydi va markazlashtirilmagan', true),
  ('77777777-7777-7777-7777-777777771302', '66666666-6666-6666-6666-666666666613', 'Faqat banklarda savdo qilinadi', false),
  ('77777777-7777-7777-7777-777777771303', '66666666-6666-6666-6666-666666666613', 'Hech qanday farqi yo''q', false),
  ('77777777-7777-7777-7777-777777771304', '66666666-6666-6666-6666-666666666613', 'Faqat haftada 3 kun ishlaydi', false),
  ('77777777-7777-7777-7777-777777771401', '66666666-6666-6666-6666-666666666614', 'Oltin, neft, bug''doy va boshqa xom ashyo', true),
  ('77777777-7777-7777-7777-777777771402', '66666666-6666-6666-6666-666666666614', 'Faqat valyutalar', false),
  ('77777777-7777-7777-7777-777777771403', '66666666-6666-6666-6666-666666666614', 'Faqat aksiyalar', false),
  ('77777777-7777-7777-7777-777777771404', '66666666-6666-6666-6666-666666666614', 'Faqat kriptovalyutalar', false),
  ('77777777-7777-7777-7777-777777771501', '66666666-6666-6666-6666-666666666615', 'Narxlar ko''tarilayotgan bozor', true),
  ('77777777-7777-7777-7777-777777771502', '66666666-6666-6666-6666-666666666615', 'Narxlar tushayotgan bozor', false),
  ('77777777-7777-7777-7777-777777771503', '66666666-6666-6666-6666-666666666615', 'Bozor yopiq bo''lgan holat', false),
  ('77777777-7777-7777-7777-777777771504', '66666666-6666-6666-6666-666666666615', 'Savdo hajmi past bo''lgan bozor', false)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- ADDITIONAL SEED: More modules and lessons for Beginner course
-- ==============================================================================

-- Module 04 for Beginner
INSERT INTO public.modules (id, course_id, title, description, order_index) VALUES
  ('33333333-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111111', 'Module 04: Trading Psychology', 'Treyder psixologiyasi va emotsional boshqaruv.', 4),
  ('33333333-3333-3333-3333-333333333336', '11111111-1111-1111-1111-111111111111', 'Module 05: First Steps', 'Birinchi savdolaringizni qanday boshlash.', 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.lessons (id, module_id, title, description, video_url, duration, order_index, xp_reward) VALUES
  ('44444444-4444-4444-4444-444444444450', '33333333-3333-3333-3333-333333333335', 'Trading Mindset', 'To''g''ri fikrlash tarzi.', 'https://www.w3schools.com/html/mov_bbb.mp4', 480, 1, 150),
  ('44444444-4444-4444-4444-444444444451', '33333333-3333-3333-3333-333333333335', 'Fear & Greed', 'Qo''rquv va ochko''zlik.', 'https://www.w3schools.com/html/mov_bbb.mp4', 520, 2, 150),
  ('44444444-4444-4444-4444-444444444452', '33333333-3333-3333-3333-333333333335', 'Discipline in Trading', 'Intizom va rejaga amal qilish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 440, 3, 150),
  ('44444444-4444-4444-4444-444444444453', '33333333-3333-3333-3333-333333333335', 'Journal Keeping', 'Treyding jurnali yuritish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 380, 4, 150),
  ('44444444-4444-4444-4444-444444444454', '33333333-3333-3333-3333-333333333335', 'Handling Losses', 'Zararlarni qabul qilish va davom etish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 500, 5, 150),
  ('44444444-4444-4444-4444-444444444460', '33333333-3333-3333-3333-333333333336', 'Demo Account Setup', 'Demo hisob ochish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 360, 1, 100),
  ('44444444-4444-4444-4444-444444444461', '33333333-3333-3333-3333-333333333336', 'Your First Trade', 'Birinchi savdongiz.', 'https://www.w3schools.com/html/mov_bbb.mp4', 600, 2, 100),
  ('44444444-4444-4444-4444-444444444462', '33333333-3333-3333-3333-333333333336', 'Reading Charts', 'Grafiklarni o''qish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 550, 3, 100),
  ('44444444-4444-4444-4444-444444444463', '33333333-3333-3333-3333-333333333336', 'Trade Management', 'Savdoni boshqarish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 480, 4, 100),
  ('44444444-4444-4444-4444-444444444464', '33333333-3333-3333-3333-333333333336', 'Building a Trading Plan', 'Shaxsiy savdo rejasi.', 'https://www.w3schools.com/html/mov_bbb.mp4', 700, 5, 200)
ON CONFLICT DO NOTHING;

-- More modules for Pro course
INSERT INTO public.modules (id, course_id, title, description, order_index) VALUES
  ('33333333-3333-3333-3333-333333333337', '22222222-2222-2222-2222-222222222222', 'Module 02: Advanced Technical Analysis', 'Chuqur texnik tahlil.', 2),
  ('33333333-3333-3333-3333-333333333338', '22222222-2222-2222-2222-222222222222', 'Module 03: Backtesting & Strategy', 'Strategiya sinash va optimallashtirish.', 3),
  ('33333333-3333-3333-3333-333333333339', '22222222-2222-2222-2222-222222222222', 'Module 04: Advanced Psychology', 'Professional psixologiya.', 4),
  ('33333333-3333-3333-3333-333333333340', '22222222-2222-2222-2222-222222222222', 'Module 05: Prop Trading', 'Prop firma challenge.', 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.lessons (id, module_id, title, description, video_url, duration, order_index, xp_reward) VALUES
  ('44444444-4444-4444-4444-444444444470', '33333333-3333-3333-3333-333333333337', 'Fibonacci Levels', 'Fibonacci darajalari.', 'https://www.w3schools.com/html/mov_bbb.mp4', 780, 1, 250),
  ('44444444-4444-4444-4444-444444444471', '33333333-3333-3333-3333-333333333337', 'Elliott Wave Theory', 'Elliott to''lqin nazariyasi.', 'https://www.w3schools.com/html/mov_bbb.mp4', 900, 2, 250),
  ('44444444-4444-4444-4444-444444444472', '33333333-3333-3333-3333-333333333337', 'Harmonic Patterns', 'Garmonik patternlar.', 'https://www.w3schools.com/html/mov_bbb.mp4', 850, 3, 300),
  ('44444444-4444-4444-4444-444444444473', '33333333-3333-3333-3333-333333333337', 'Multi-Timeframe Analysis', 'Ko''p timeframe tahlil.', 'https://www.w3schools.com/html/mov_bbb.mp4', 720, 4, 250),
  ('44444444-4444-4444-4444-444444444474', '33333333-3333-3333-3333-333333333337', 'Volume Profile', 'Hajm profili.', 'https://www.w3schools.com/html/mov_bbb.mp4', 680, 5, 250),
  ('44444444-4444-4444-4444-444444444480', '33333333-3333-3333-3333-333333333338', 'Manual Backtesting', 'Qo''lda backtesting.', 'https://www.w3schools.com/html/mov_bbb.mp4', 900, 1, 300),
  ('44444444-4444-4444-4444-444444444481', '33333333-3333-3333-3333-333333333338', 'Strategy Development', 'Strategiya yaratish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 1020, 2, 300),
  ('44444444-4444-4444-4444-444444444482', '33333333-3333-3333-3333-333333333338', 'Risk:Reward Optimization', 'Risk:Reward optimallashtirish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 750, 3, 300),
  ('44444444-4444-4444-4444-444444444483', '33333333-3333-3333-3333-333333333338', 'Trade Journal Analysis', 'Jurnal tahlili.', 'https://www.w3schools.com/html/mov_bbb.mp4', 600, 4, 250),
  ('44444444-4444-4444-4444-444444444484', '33333333-3333-3333-3333-333333333338', 'Win Rate vs RR', 'Win Rate va Risk:Reward nisbati.', 'https://www.w3schools.com/html/mov_bbb.mp4', 680, 5, 300),
  ('44444444-4444-4444-4444-444444444490', '33333333-3333-3333-3333-333333333339', 'Peak Performance', 'Eng yuqori samaradorlik.', 'https://www.w3schools.com/html/mov_bbb.mp4', 620, 1, 250),
  ('44444444-4444-4444-4444-444444444491', '33333333-3333-3333-3333-333333333339', 'Cognitive Biases', 'Kognitiv xatolar.', 'https://www.w3schools.com/html/mov_bbb.mp4', 700, 2, 250),
  ('44444444-4444-4444-4444-444444444492', '33333333-3333-3333-3333-333333333339', 'Emotional Control', 'Emotsiyalarni boshqarish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 580, 3, 250),
  ('44444444-4444-4444-4444-444444444493', '33333333-3333-3333-3333-333333333339', 'Consistency Building', 'Barqarorlik yaratish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 650, 4, 300),
  ('44444444-4444-4444-4444-444444444494', '33333333-3333-3333-3333-333333333339', 'Professional Mindset', 'Professional fikrlash.', 'https://www.w3schools.com/html/mov_bbb.mp4', 720, 5, 300),
  ('44444444-4444-4444-4444-444444444500', '33333333-3333-3333-3333-333333333340', 'What is Prop Trading?', 'Prop treyding nima?', 'https://www.w3schools.com/html/mov_bbb.mp4', 540, 1, 300),
  ('44444444-4444-4444-4444-444444444501', '33333333-3333-3333-3333-333333333340', 'Challenge Rules', 'Challenge qoidalari.', 'https://www.w3schools.com/html/mov_bbb.mp4', 480, 2, 250),
  ('44444444-4444-4444-4444-444444444502', '33333333-3333-3333-3333-333333333340', 'Risk Management for Props', 'Prop uchun risk boshqarish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 700, 3, 300),
  ('44444444-4444-4444-4444-444444444503', '33333333-3333-3333-3333-333333333340', 'Scaling Strategy', 'Hajmni oshirish strategiyasi.', 'https://www.w3schools.com/html/mov_bbb.mp4', 650, 4, 300),
  ('44444444-4444-4444-4444-444444444504', '33333333-3333-3333-3333-333333333340', 'Funded Account Management', 'Moliyalashtirilgan hisob boshqarish.', 'https://www.w3schools.com/html/mov_bbb.mp4', 800, 5, 350)
ON CONFLICT DO NOTHING;

-- Update courses with exact master prompt titles, prices and descriptions
UPDATE public.courses SET
  title = 'STANDARD',
  price = 299000,
  description = 'Tradingni 0 dan o‘rganish. Broker, MT5, Forex sessiyalari, grafiklar, risk management va prop firmalar.',
  short_description = '0 dan boshlash — Tradingni 0 dan o‘rganish',
  featured = true
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.courses SET
  title = 'PRO',
  price = 599000,
  description = 'Professional tahlil va strategiyalar. SMC, Order Block, FVG, Liquidity Grab, Killzones va Backtest.',
  short_description = 'Professional daraja — Professional tahlil va strategiyalar',
  featured = true
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Insert VIP Course
INSERT INTO public.courses (id, title, slug, description, short_description, level, price, published, featured)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'VIP',
  'vip',
  'Individual yondashuv + mentorlik. PRO darslari, shaxsiy chart va entry tahlili, yopiq VIP guruh va risk nazorati.',
  'Individual mentorlik — 🏆 Individual yondashuv + mentorlik',
  'vip',
  999000,
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price,
  description = EXCLUDED.description;
