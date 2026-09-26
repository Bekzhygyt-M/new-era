-- ============================================================================
-- NEW ERA — PostgreSQL schema (TZ §28) with Row Level Security (TZ §29).
--
-- Authorization model
-- -------------------
-- The platform authenticates with its own scrypt password hashes and a signed
-- session cookie, not Supabase Auth, so `auth.uid()` is never populated here.
-- Therefore:
--   * every table has RLS ENABLED with no permissive policy for `anon` or
--     `authenticated` — a leaked anon key reads nothing;
--   * the catalogue tables additionally expose a read-only policy for public
--     content only (published courses/modules/lessons metadata, FAQ, approved
--     reviews, payment methods, active disclaimer);
--   * the application connects server-side with the service role, which
--     bypasses RLS, and re-checks every request in lib/permissions.ts.
--
-- Run once against a fresh Supabase project:  psql "$DATABASE_URL" -f schema.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Profiles ───────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  full_name      text not null default 'Yangi Treyder',
  first_name     text,
  last_name      text,
  role           text not null default 'student'
                 check (role in ('student', 'admin', 'instructor')),
  level          text not null default 'Beginner',
  xp             integer not null default 0 check (xp >= 0),
  phone          text,
  avatar_url     text,
  -- scrypt$N$r$p$salt$hash — never a plaintext password (TZ §29).
  password_hash  text,
  language       text not null default 'uz' check (language in ('uz', 'ru', 'en')),
  theme          text not null default 'dark' check (theme in ('dark', 'light')),
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists profiles_email_key on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── Catalogue ──────────────────────────────────────────────────────────────

create table if not exists public.courses (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text not null unique,
  description        text not null default '',
  short_description  text not null default '',
  level              text not null default 'beginner',
  price              integer not null default 0 check (price >= 0),
  currency           text not null default 'UZS',
  published          boolean not null default false,
  featured           boolean not null default false,
  thumbnail_url      text,
  order_index        integer not null default 0,
  certificate_prefix text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists courses_published_idx on public.courses (published, order_index);

drop trigger if exists courses_touch on public.courses;
create trigger courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

create table if not exists public.modules (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses (id) on delete cascade,
  title             text not null,
  description       text,
  order_index       integer not null default 0,
  icon              text,
  is_published      boolean not null default true,
  requires_backtest boolean not null default false,
  requires_journal  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (course_id, order_index)
);

create index if not exists modules_course_idx on public.modules (course_id, order_index);

drop trigger if exists modules_touch on public.modules;
create trigger modules_touch before update on public.modules
  for each row execute function public.touch_updated_at();

create table if not exists public.lessons (
  id                 uuid primary key default gen_random_uuid(),
  module_id          uuid not null references public.modules (id) on delete cascade,
  title              text not null,
  short_description  text,
  description        text,
  -- TZ §11: shown under the video.
  summary            text,
  key_terms          jsonb not null default '[]'::jsonb,
  video_url          text not null,
  video_storage_path text,
  video_provider     text not null default 'file',
  duration           integer not null default 0 check (duration >= 0),
  order_index        integer not null default 0,
  xp_reward          integer not null default 50 check (xp_reward >= 0),
  -- TZ §7.3: percent of the video required before the test opens.
  watch_requirement  integer not null default 90 check (watch_requirement between 1 and 100),
  is_published       boolean not null default false,
  preview_enabled    boolean not null default false,
  allow_seeking      boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (module_id, order_index)
);

create index if not exists lessons_module_idx on public.lessons (module_id, order_index);

drop trigger if exists lessons_touch on public.lessons;
create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();

-- ─── Content translations (TZ §25, §28) ─────────────────────────────────────
-- The base row always carries Uzbek; these tables hold ru/en overrides, so a
-- missing translation transparently falls back to the original text.

create table if not exists public.course_translations (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses (id) on delete cascade,
  locale            text not null check (locale in ('ru', 'en')),
  title             text,
  short_description text,
  description       text,
  updated_at        timestamptz not null default now(),
  unique (course_id, locale)
);

create index if not exists course_translations_idx on public.course_translations (course_id, locale);

drop trigger if exists course_translations_touch on public.course_translations;
create trigger course_translations_touch before update on public.course_translations
  for each row execute function public.touch_updated_at();

create table if not exists public.module_translations (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  locale      text not null check (locale in ('ru', 'en')),
  title       text,
  description text,
  updated_at  timestamptz not null default now(),
  unique (module_id, locale)
);

create index if not exists module_translations_idx on public.module_translations (module_id, locale);

drop trigger if exists module_translations_touch on public.module_translations;
create trigger module_translations_touch before update on public.module_translations
  for each row execute function public.touch_updated_at();

create table if not exists public.lesson_translations (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons (id) on delete cascade,
  locale            text not null check (locale in ('ru', 'en')),
  title             text,
  short_description text,
  description       text,
  summary           text,
  key_terms         jsonb,
  updated_at        timestamptz not null default now(),
  unique (lesson_id, locale)
);

create index if not exists lesson_translations_idx on public.lesson_translations (lesson_id, locale);

drop trigger if exists lesson_translations_touch on public.lesson_translations;
create trigger lesson_translations_touch before update on public.lesson_translations
  for each row execute function public.touch_updated_at();

-- ─── Lesson materials (TZ §11, §28) ─────────────────────────────────────────

create table if not exists public.lesson_materials (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  title       text not null,
  url         text not null,
  type        text not null default 'file',
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists lesson_materials_idx on public.lesson_materials (lesson_id, order_index);

-- ─── Tests ──────────────────────────────────────────────────────────────────

create table if not exists public.tests (
  id            uuid primary key default gen_random_uuid(),
  -- One test per lesson (TZ §13).
  lesson_id     uuid not null unique references public.lessons (id) on delete cascade,
  title         text not null,
  passing_score integer not null default 90 check (passing_score between 1 and 100),
  max_attempts  integer check (max_attempts is null or max_attempts > 0),
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists tests_touch on public.tests;
create trigger tests_touch before update on public.tests
  for each row execute function public.touch_updated_at();

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references public.tests (id) on delete cascade,
  question    text not null,
  order_index integer not null default 0,
  points      integer not null default 1 check (points > 0),
  multiple    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (test_id, order_index)
);

create index if not exists questions_test_idx on public.questions (test_id, order_index);

create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  answer      text not null,
  -- Never sent to a student: the server grades and returns only the score.
  is_correct  boolean not null default false,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (question_id, order_index)
);

create index if not exists answers_question_idx on public.answers (question_id, order_index);

-- ─── Enrollment and progress ────────────────────────────────────────────────

create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  status       text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  purchased_at timestamptz not null default now(),
  source       text not null default 'manual',
  completed_at timestamptz,
  unique (user_id, course_id)
);

create index if not exists enrollments_user_idx on public.enrollments (user_id, status);

create table if not exists public.lesson_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  lesson_id        uuid not null references public.lessons (id) on delete cascade,
  watched_seconds  integer not null default 0 check (watched_seconds >= 0),
  watch_percentage integer not null default 0 check (watch_percentage between 0 and 100),
  video_completed  boolean not null default false,
  test_passed      boolean not null default false,
  test_score       integer not null default 0 check (test_score between 0 and 100),
  -- Guards the "XP once per lesson" rule (TZ §14).
  xp_earned        boolean not null default false,
  completed        boolean not null default false,
  completed_at     timestamptz,
  updated_at       timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists lesson_progress_user_idx on public.lesson_progress (user_id);

drop trigger if exists lesson_progress_touch on public.lesson_progress;
create trigger lesson_progress_touch before update on public.lesson_progress
  for each row execute function public.touch_updated_at();

create table if not exists public.test_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  test_id         uuid not null references public.tests (id) on delete cascade,
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  score           integer not null check (score between 0 and 100),
  passed          boolean not null default false,
  correct_count   integer not null default 0 check (correct_count >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  answers_data    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists test_attempts_user_idx on public.test_attempts (user_id, test_id);

create table if not exists public.xp_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  amount       integer not null,
  reason       text not null,
  source       text not null check (source in ('lesson', 'test', 'module', 'course', 'admin')),
  reference_id text,
  created_at   timestamptz not null default now()
);

create index if not exists xp_transactions_user_idx on public.xp_transactions (user_id, created_at desc);
-- One XP award per (user, source, reference) — makes double-award impossible.
create unique index if not exists xp_transactions_once_idx
  on public.xp_transactions (user_id, source, reference_id)
  where reference_id is not null;

-- ─── Payments (TZ §19-20) ───────────────────────────────────────────────────

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  -- NE-YYYYMMDD-XXXXXX
  order_id            text not null unique,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  course_id           uuid not null references public.courses (id) on delete restrict,
  amount              integer not null check (amount >= 0),
  currency            text not null default 'UZS',
  provider            text not null default 'manual',
  status              text not null default 'pending'
                      check (status in ('pending', 'receipt_submitted', 'approved',
                                        'rejected', 'expired', 'cancelled')),
  first_name          text,
  last_name           text,
  phone               text,
  comment             text,
  -- Receipts live in private storage; this holds the authorized route path.
  receipt_url         text,
  expires_at          timestamptz,
  submitted_at        timestamptz,
  approved_at         timestamptz,
  rejected_at         timestamptz,
  cancelled_at        timestamptz,
  rejection_reason    text,
  approved_by         text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- TZ §20: a rejection must carry its reason.
  constraint payments_rejection_reason_required
    check (status <> 'rejected' or rejection_reason is not null)
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo        text not null default '',
  enabled     boolean not null default true,
  -- TZ §4.3: a method may be listed as planned rather than actually available.
  supported   boolean not null default false,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── Notifications and messages (TZ §21) ────────────────────────────────────

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  -- NULL user_id means a broadcast, fanned out at read time.
  user_id    uuid references public.profiles (id) on delete cascade,
  title      text not null,
  message    text not null,
  type       text not null default 'system',
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  sender     text not null check (sender in ('user', 'admin')),
  text       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_user_idx on public.messages (user_id, created_at);

-- ─── Practice: journal and backtests (TZ §17-18) ────────────────────────────

create table if not exists public.journals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  trade_date     date not null,
  pair           text not null,
  direction      text not null check (direction in ('BUY', 'SELL')),
  entry_price    text not null,
  exit_price     text not null,
  stop_loss      text,
  take_profit    text,
  pnl            numeric(14, 2) not null default 0,
  rr             text not null default '',
  status         text not null default 'BREAKEVEN' check (status in ('WIN', 'LOSS', 'BREAKEVEN')),
  strategy       text not null default '',
  screenshot_url text,
  note           text not null default '',
  created_at     timestamptz not null default now()
);

create index if not exists journals_user_idx on public.journals (user_id, trade_date desc);

create table if not exists public.backtests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  module_id      uuid references public.modules (id) on delete set null,
  name           text not null,
  instrument     text not null,
  timeframe      text not null,
  total_trades   integer not null check (total_trades >= 1),
  wins           integer not null default 0 check (wins >= 0),
  losses         integer not null default 0 check (losses >= 0),
  win_rate       numeric(5, 2) not null default 0,
  rr             text not null default '',
  pnl_percent    numeric(10, 2) not null default 0,
  max_dd         text not null default '',
  profit_factor  text not null default '',
  screenshot_url text,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  constraint backtests_wins_within_trades check (wins <= total_trades)
);

create index if not exists backtests_user_idx on public.backtests (user_id, created_at desc);

-- ─── Certificates (TZ §23) ──────────────────────────────────────────────────

create table if not exists public.certificates (
  id             uuid primary key default gen_random_uuid(),
  -- NE-STD-2026-000124
  certificate_id text not null unique,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  course_id      uuid not null references public.courses (id) on delete cascade,
  full_name      text not null,
  course_title   text not null,
  issued_at      timestamptz not null default now(),
  revoked        boolean not null default false,
  unique (user_id, course_id)
);

create index if not exists certificates_user_idx on public.certificates (user_id);

-- ─── Risk disclaimer (TZ §8.1) ──────────────────────────────────────────────

create table if not exists public.risk_disclaimer_versions (
  id             uuid primary key default gen_random_uuid(),
  version        text not null unique,
  content        text not null,
  summary_points jsonb not null default '[]'::jsonb,
  is_active      boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Exactly one active version at a time.
create unique index if not exists risk_disclaimer_single_active
  on public.risk_disclaimer_versions (is_active) where is_active;

create table if not exists public.risk_disclaimer_acceptances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  version     text not null references public.risk_disclaimer_versions (version) on delete cascade,
  accepted_at timestamptz not null default now(),
  ip          text,
  user_agent  text,
  unique (user_id, version)
);

-- ─── Reviews and FAQ ────────────────────────────────────────────────────────

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  author_name text not null default '',
  rating      integer not null check (rating between 1 and 5),
  content     text not null,
  approved    boolean not null default false,
  created_at  timestamptz not null default now(),
  -- One review per course per student.
  unique (user_id, course_id)
);

create index if not exists reviews_approved_idx on public.reviews (approved, created_at desc);

create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question_uz text not null,
  question_ru text,
  question_en text,
  answer_uz   text not null,
  answer_ru   text,
  answer_en   text,
  order_index integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Password resets (TZ §9) ────────────────────────────────────────────────

create table if not exists public.password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  email       text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected', 'used')),
  -- SHA-256 of the token. The token itself is never stored.
  token_hash  text,
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  expires_at  timestamptz,
  used_at     timestamptz
);

create index if not exists password_resets_token_idx on public.password_resets (token_hash)
  where token_hash is not null;
create index if not exists password_resets_status_idx on public.password_resets (status, created_at desc);

-- ─── Activity log (TZ §22.2) ────────────────────────────────────────────────

create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete set null,
  action     text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_idx on public.activity_logs (user_id, created_at desc);
create index if not exists activity_logs_created_idx on public.activity_logs (created_at desc);

-- ─── Platform settings — single row (TZ §22) ────────────────────────────────

create table if not exists public.platform_settings (
  id                      boolean primary key default true check (id),
  passing_score           integer not null default 90 check (passing_score between 1 and 100),
  watch_requirement       integer not null default 90 check (watch_requirement between 1 and 100),
  xp_lesson               integer not null default 50,
  xp_test                 integer not null default 100,
  xp_module               integer not null default 300,
  xp_course               integer not null default 1000,
  payment_window_minutes  integer not null default 15 check (payment_window_minutes > 0),
  currency                text not null default 'UZS',
  support_telegram        text not null default '',
  support_email           text not null default '',
  payment_instructions    text not null default '',
  card_number             text not null default '',
  card_holder             text not null default '',
  level_thresholds        jsonb not null default
    '[{"name":"Beginner","xp":0},{"name":"Intermediate","xp":1000},{"name":"Advanced","xp":2500},{"name":"Pro","xp":5000}]'::jsonb,
  updated_at              timestamptz not null default now()
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists platform_settings_touch on public.platform_settings;
create trigger platform_settings_touch before update on public.platform_settings
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security (TZ §29)
--
-- RLS is enabled everywhere. The application uses the service role, which
-- bypasses RLS by design; these policies decide what a leaked anon/authenticated
-- key could reach — which is public catalogue content only, and nothing
-- belonging to any individual user.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'courses', 'modules', 'lessons', 'tests', 'questions', 'answers',
    'course_translations', 'module_translations', 'lesson_translations', 'lesson_materials',
    'enrollments', 'lesson_progress', 'test_attempts', 'xp_transactions',
    'payments', 'payment_methods', 'notifications', 'messages', 'journals',
    'backtests', 'certificates', 'risk_disclaimer_versions',
    'risk_disclaimer_acceptances', 'reviews', 'faqs', 'password_resets',
    'activity_logs', 'platform_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end
$$;

-- Public, read-only catalogue. Everything not covered below stays unreadable.

drop policy if exists courses_public_read on public.courses;
create policy courses_public_read on public.courses
  for select to anon, authenticated using (published);

drop policy if exists modules_public_read on public.modules;
create policy modules_public_read on public.modules
  for select to anon, authenticated using (
    is_published and exists (
      select 1 from public.courses c where c.id = modules.course_id and c.published
    )
  );

-- Lesson rows are visible for the syllabus, but the video URL is useless
-- without an enrollment: /api/video/* re-checks access on every request.
drop policy if exists lessons_public_read on public.lessons;
create policy lessons_public_read on public.lessons
  for select to anon, authenticated using (
    is_published and exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and m.is_published and c.published
    )
  );

drop policy if exists payment_methods_public_read on public.payment_methods;
create policy payment_methods_public_read on public.payment_methods
  for select to anon, authenticated using (enabled);

drop policy if exists faqs_public_read on public.faqs;
create policy faqs_public_read on public.faqs
  for select to anon, authenticated using (published);

-- Approved reviews only, and never the reviewer's user_id link to a profile.
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated using (approved);

drop policy if exists disclaimer_public_read on public.risk_disclaimer_versions;
create policy disclaimer_public_read on public.risk_disclaimer_versions
  for select to anon, authenticated using (is_active);

-- Translations follow the visibility of the row they translate.

drop policy if exists course_translations_public_read on public.course_translations;
create policy course_translations_public_read on public.course_translations
  for select to anon, authenticated using (
    exists (select 1 from public.courses c where c.id = course_translations.course_id and c.published)
  );

drop policy if exists module_translations_public_read on public.module_translations;
create policy module_translations_public_read on public.module_translations
  for select to anon, authenticated using (
    exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = module_translations.module_id and m.is_published and c.published
    )
  );

drop policy if exists lesson_translations_public_read on public.lesson_translations;
create policy lesson_translations_public_read on public.lesson_translations
  for select to anon, authenticated using (
    exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_translations.lesson_id and l.is_published and m.is_published and c.published
    )
  );

-- lesson_materials stays private: course files belong to enrolled students and
-- are fetched server-side after the enrollment check.

-- Deliberately NO policies for: profiles, lesson_materials, tests, questions, answers,
-- enrollments, lesson_progress, test_attempts, xp_transactions, payments,
-- notifications, messages, journals, backtests, certificates,
-- risk_disclaimer_acceptances, password_resets, activity_logs,
-- platform_settings. Those are reachable only through the service role, so a
-- student can never read another student's payments, receipts or progress and
-- correct answers are never exposed (TZ §29).

-- ============================================================================
-- Storage buckets (TZ §12, §19)
--
-- Both are PRIVATE: objects are reachable only through the service role or a
-- short-lived signed URL that the application issues after checking access.
-- No policies are added for anon/authenticated, so a leaked anon key reads
-- nothing from either bucket.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false),
       ('receipts', 'receipts', false),
       ('images', 'images', false)
on conflict (id) do nothing;
