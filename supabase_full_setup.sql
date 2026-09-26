-- ==============================================================================
-- NEW ERA PLATFORM - MASTER SUPABASE SQL SETUP SCRIPT
-- Run this in your Supabase Project SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE / EXTEND ALL TABLES
-- ==============================================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'instructor')),
    level TEXT DEFAULT 'Beginner',
    xp INTEGER DEFAULT 0,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- COURSES
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    thumbnail_url TEXT,
    level TEXT DEFAULT 'beginner',
    price INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'UZS',
    published BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MODULES
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    short_description TEXT,
    description TEXT,
    video_url TEXT,
    video_provider TEXT DEFAULT 'direct',
    duration INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER DEFAULT 100,
    watch_requirement INTEGER DEFAULT 90,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    order_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'UZS',
    provider TEXT DEFAULT 'click',
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

-- ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active',
    source TEXT DEFAULT 'payment',
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

-- TESTS
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 85,
    max_attempts INTEGER DEFAULT 5,
    time_limit_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    explanation TEXT,
    order_index INTEGER DEFAULT 0,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TEST ATTEMPTS
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. PERMISSIVE ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies to prevent conflicts
DO $$ 
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Public can view courses" ON public.courses';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view modules" ON public.modules';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view lessons" ON public.lessons';
    EXECUTE 'DROP POLICY IF EXISTS "Profiles access" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Payments access" ON public.payments';
    EXECUTE 'DROP POLICY IF EXISTS "Enrollments access" ON public.enrollments';
    EXECUTE 'DROP POLICY IF EXISTS "Tests access" ON public.tests';
    EXECUTE 'DROP POLICY IF EXISTS "Settings access" ON public.platform_settings';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Permissive policies for smooth operation
CREATE POLICY "Public can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Public can view lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Profiles access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Payments access" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enrollments access" ON public.enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Tests access" ON public.tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Settings access" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. SEED CORE DATA & MASTER ADMIN
-- ==============================================================================

-- Seed Courses
INSERT INTO public.courses (id, title, slug, description, short_description, level, price, currency, published, featured)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'STANDARD TRADING',
    'standard',
    'Tradingni 0 dan o‘rganish. Broker, MT5, Forex sessiyalari, grafiklar, risk management va prop firmalar.',
    'Noldan boshlab professional treyding asoslari.',
    'beginner',
    299000,
    'UZS',
    true,
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    'PRO TRADING',
    'pro',
    'Professional tahlil va strategiyalar. SMC, Order Block, FVG, Liquidity Grab, Killzones va Backtest.',
    'Smart Money Concepts, Liquidity va Prop Challenge strategiyalari.',
    'pro',
    599000,
    'UZS',
    true,
    true
),
(
    '33333333-3333-3333-3333-333333333333',
    'VIP TRADING',
    'vip',
    'Individual yondashuv + mentorlik. PRO darslari, shaxsiy chart va entry tahlili, yopiq VIP guruh va risk nazorati.',
    'Bosh treyder bilan 1-on-1 individual mentorlik.',
    'vip',
    999000,
    'UZS',
    true,
    true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    price = EXCLUDED.price,
    published = EXCLUDED.published;

-- Seed Platform Settings
INSERT INTO public.platform_settings (key, value)
VALUES 
    ('test_passing_score', '85'),
    ('support_email', 'support@newera.uz'),
    ('card_click', '8600 5304 1234 5678'),
    ('card_payme', '9860 3501 9876 5432'),
    ('receiver_name', 'Abbos Erkinov')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed Master Admin Profile
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    level,
    xp,
    phone
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@gmail.com',
    'Bosh Admin',
    'admin',
    'Pro',
    10000,
    '+998 901234567'
)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    full_name = 'Bosh Admin',
    level = 'Pro',
    xp = 10000;

-- ==============================================================================
-- 5. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, level, xp, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Treyder'),
    CASE 
      WHEN NEW.email = 'admin@gmail.com' THEN 'admin'
      ELSE 'student'
    END,
    CASE 
      WHEN NEW.email = 'admin@gmail.com' THEN 'Pro'
      ELSE 'Beginner'
    END,
    CASE 
      WHEN NEW.email = 'admin@gmail.com' THEN 10000
      ELSE 0
    END,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SUCCESS NOTICE
SELECT 'NEW ERA DATABASE SETUP COMPLETED SUCCESSFULLY! Master Admin: admin@gmail.com' as status;
