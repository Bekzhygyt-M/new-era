-- ==============================================================================
-- NEW ERA - SUPABASE DATABASE SCHEMA
-- Please copy and run this entire script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. PROFILES
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'student'::text,
    level TEXT DEFAULT 'Beginner'::text,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. COURSES
CREATE TABLE public.courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    level TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MODULES
CREATE TABLE public.modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. LESSONS
CREATE TABLE public.lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    duration INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 100,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ENROLLMENTS
CREATE TABLE public.enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active'::text,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, course_id)
);

-- 6. LESSON PROGRESS
CREATE TABLE public.lesson_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    watched_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    test_passed BOOLEAN DEFAULT false,
    test_score INTEGER,
    xp_earned BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, lesson_id)
);

-- 7. TESTS ARCHITECTURE
CREATE TABLE public.tests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE TABLE public.answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false
);

CREATE TABLE public.test_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, level, xp)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'student',
    'Beginner',
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to safely increment user XP
CREATE OR REPLACE FUNCTION public.increment_xp(user_id_param UUID, xp_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET xp = xp + xp_amount
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, update their own profile.
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Courses/Modules/Lessons: Anyone can read published courses.
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (published = true);
CREATE POLICY "Anyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT USING (is_published = true);

-- Enrollments: Users can only see their own enrollments.
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lesson Progress: Users can view and update their own progress.
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- Tests: Read-only for students, insert for attempts
CREATE POLICY "Anyone can view tests" ON public.tests FOR SELECT USING (true);
CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Anyone can view answers" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Users can view own attempts" ON public.test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- Create Beginner Course
INSERT INTO public.courses (id, title, slug, description, level, price, published) 
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'BEGINNER TRADING', 
    'beginner-trading', 
    'Treydingni endi boshlayotganlar uchun. Haqiqiy bozorlarga kirishdan oldin mustahkam poydevor yarating.', 
    'beginner', 
    149000, 
    true
) ON CONFLICT DO NOTHING;

-- Create Pro Course
INSERT INTO public.courses (id, title, slug, description, level, price, published) 
VALUES (
    '22222222-2222-2222-2222-222222222222', 
    'PRO TRADING', 
    'pro-trading', 
    'Asoslarni biladigan va professional darajada savdo qilishni xohlaydiganlar uchun. Chuqurroq o''rganing, ko''proq ishlang.', 
    'pro', 
    279000, 
    true
) ON CONFLICT DO NOTHING;

-- Modules for Beginner
INSERT INTO public.modules (id, course_id, title, description, order_index) VALUES 
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Module 01: Trading Foundations', 'Treyding nima va moliya bozorlari qanday ishlaydi.', 1),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Module 02: Candlesticks & Charts', 'Svechalar va grafiklarni o''qish sirlari.', 2),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Module 03: Risk Management', 'Kapitalni saqlab qolish va to''g''ri boshqarish.', 3);

-- Lessons for Module 01
INSERT INTO public.lessons (id, module_id, title, description, video_url, duration, order_index, xp_reward) VALUES 
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', 'What is Trading?', 'Treyding haqida umumiy tushuncha.', 'https://www.w3schools.com/html/mov_bbb.mp4', 332, 1, 100),
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333331', 'Financial Markets', 'Moliya bozorlari turlari.', 'https://www.w3schools.com/html/mov_bbb.mp4', 494, 2, 100),
('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333331', 'Brokers & Platforms', 'Qanday qilib to''g''ri broker tanlash mumkin.', 'https://www.w3schools.com/html/mov_bbb.mp4', 625, 3, 100);

-- Lessons for Module 02
INSERT INTO public.lessons (id, module_id, title, description, video_url, duration, order_index, xp_reward) VALUES 
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333332', 'Candlestick Basics', 'Yapon svechalari.', 'https://www.w3schools.com/html/mov_bbb.mp4', 450, 1, 150),
('44444444-4444-4444-4444-444444444445', '33333333-3333-3333-3333-333333333332', 'Support and Resistance', 'Qo''llab-quvvatlash va qarshilik zonalari.', 'https://www.w3schools.com/html/mov_bbb.mp4', 540, 2, 150);

-- Lessons for Module 03
INSERT INTO public.lessons (id, module_id, title, description, video_url, duration, order_index, xp_reward) VALUES 
('44444444-4444-4444-4444-444444444446', '33333333-3333-3333-3333-333333333333', 'Risk Management', 'Risk/Reward nisbati.', 'https://www.w3schools.com/html/mov_bbb.mp4', 720, 1, 200),
('44444444-4444-4444-4444-444444444447', '33333333-3333-3333-3333-333333333333', 'Position Sizing', 'Lot hajmini to''g''ri hisoblash.', 'https://www.w3schools.com/html/mov_bbb.mp4', 600, 2, 200);

-- Modules for Pro
INSERT INTO public.modules (id, course_id, title, description, order_index) VALUES 
('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', 'Module 01: Smart Money Concepts', 'Institutional savdo strategiyalari.', 1);

-- Lessons for Pro Module 01
INSERT INTO public.lessons (id, module_id, title, description, video_url, duration, order_index, xp_reward) VALUES 
('44444444-4444-4444-4444-444444444448', '33333333-3333-3333-3333-333333333334', 'Liquidity & Inducement', 'Bozor likvidligi va tuzoqlar.', 'https://www.w3schools.com/html/mov_bbb.mp4', 850, 1, 300),
('44444444-4444-4444-4444-444444444449', '33333333-3333-3333-3333-333333333334', 'Order Blocks & Imbalance', 'FVG va OB tushunchalari.', 'https://www.w3schools.com/html/mov_bbb.mp4', 920, 2, 300);
