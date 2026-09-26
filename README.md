# NEW ERA — Premium Online Trading Education Platform

NEW ERA is a production-ready, commercial-grade online trading education academy built with Next.js 15 (App Router), TypeScript, Tailwind CSS, PostgreSQL via Supabase (with Row Level Security and private Storage), Framer Motion, Recharts, Lucide React, and Zod.

Authentication is the platform's own: scrypt password hashing plus an HMAC-signed session cookie — not Supabase Auth. Data and uploads run through a two-backend layer (`lib/db`, `lib/storage`): a local JSON store for development, Supabase for production. See `supabase/SETUP.md`.

---

## 🚀 Key Features

### 1. Public Academy & Terminal Experience
- **Interactive Trading Terminal Hero**: Live cryptocurrency & forex tickers (BTC/USD, ETH/USD, EUR/USD), candlestick visualization, order depth, and floating metrics.
- **Beginner & PRO Tracks**: Dual curated pathways with subtle purple PRO accenting.
- **8-Step Educational Roadmap**: Register $\rightarrow$ Choose Course $\rightarrow$ Purchase $\rightarrow$ Watch Video (90% threshold) $\rightarrow$ Pass Test (90%+) $\rightarrow$ Earn XP $\rightarrow$ Unlock Next Lesson $\rightarrow$ Course Completion.
- **Comprehensive Public Pages**:
  - `/` — Premium Academy Homepage
  - `/courses` — Searchable & filterable course catalog
  - `/courses/[courseId]` — Detailed course curriculum, preview, and syllabus
  - `/about` — Academy mission & instructor credentials
  - `/mentorship` — Group & 1-on-1 VIP mentorship programs
  - `/reviews` — Verified student testimonials and review submission
  - `/faq` — Searchable multilingual knowledge base
  - `/terms`, `/privacy`, `/refund-policy` — Legally formatted terms and policies
  - `/forgot-password`, `/reset-password` — Password recovery flow

### 2. Manual Payment System & 15-Minute Expiration Timer
- **Automatic Order ID Generation**: Format `NE-YYYYMMDD-XXXXXX` (e.g. `NE-20260820-001245`).
- **Server-Side 15-Minute Timer**: Expiration calculated from `expires_at = created_at + 15 minutes`.
- **Manual Payment Methods**: Click, Payme, Uzum Bank, and Bank Card transfers with configurable card/account numbers.
- **Receipt Submission**: Users upload proof screenshots (PNG, JPG, WEBP) along with First Name, Last Name, Phone, and optional comments.
- **Pending Verification Status**: Course remains safely locked until administrator reviews and approves.
- **Dedicated Payment Status**: `/payment/[paymentId]` with live countdown and review progress.

### 3. Progressive Learning & Testing Engine
- **Video Player with 90% Threshold**: Real-time watch tracking. Once $\ge 90\%$ is watched, the lesson test unlocks.
- **Server-Side Test Evaluation**: 10 questions per test with server-side answer verification (correct answers never exposed to the client).
- **90% Passing Rule**: Minimum 90% required to pass (admin-configurable).
  - $\ge 90\%$: Lesson completed $\rightarrow$ Single XP awarded $\rightarrow$ Next lesson sequentially unlocked.
  - $< 90\%$: Test failed $\rightarrow$ 0 XP awarded $\rightarrow$ Next lesson locked $\rightarrow$ Retake test option.
- **XP & Level Progression**:
  - `Beginner`: 0 – 999 XP
  - `Intermediate`: 1,000 – 2,499 XP
  - `Advanced`: 2,500 – 4,999 XP
  - `Pro`: 5,000+ XP
- **7-Day Learning Streak & Achievements System**.

### 4. Admin Control Center (`/admin/*`)
- **Server-Protected Access**: Strictly checks `profile.role === 'admin'`.
- **Business Control Panel (`/admin`)**: Top KPIs (Users, Revenue, Paid Users, Pending Receipts, Courses, Lessons) and real-time feeds.
- **User Directory & Deep Analytics (`/admin/users`, `/admin/users/[userId]`)**: Inspect student watch percentages, test scores, enrollments, and activity logs.
- **Course & Module Builder (`/admin/courses`, `/admin/courses/create`, `/admin/courses/[courseId]`)**: Manage titles, levels, prices, modules, and thumbnails.
- **Video Lesson Analytics (`/admin/lessons`, `/admin/lessons/create`)**: View counts, completion percentages, drop-off rates, video URLs, and XP settings.
- **Test Constructor (`/admin/tests`, `/admin/tests/create`)**: Create tests with 10 questions, multiple choice answers, and difficulty analytics.
- **Payment Verification Queue (`/admin/payments`, `/admin/payments/[paymentId]`)**:
  - Filter by Pending Verification, Approved, Rejected, Expired, All.
  - Search by Order ID, User Name, Email, or Phone.
  - Receipt Viewer Modal with zoomable receipt inspection.
  - 1-Click **APPROVE** (sets `approved`, creates active enrollment, fires user notification).
  - 1-Click **REJECT** (prompts for rejection reason, notifies user).
- **Receipt Gallery (`/admin/receipts`)**: Visual queue of all submitted receipts.
- **Platform Analytics (`/admin/analytics`)**: Recharts graphs for Revenue over time, User registrations, and Level distributions.
- **Review Moderation (`/admin/reviews`)**: Approve or remove student reviews.
- **FAQ Management (`/admin/faq`)**: Create and publish multilingual FAQ items.
- **System Broadcasts (`/admin/notifications`)**: Send broadcast alerts to students.
- **Platform Settings (`/admin/settings`)**: Configure test passing score, currency, support links, and payment instructions.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS & Vanilla CSS
- **Database**: PostgreSQL on Supabase (Row Level Security, private Storage buckets)
- **Auth**: in-house — scrypt hashes, HMAC-signed session cookie, roles re-checked server-side
- **Charts & Visuals**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Validation**: Zod & React Hook Form
- **Toasts**: Sonner

---

## 📦 Project Structure

```
NewEra/
├── app/
│   ├── (public)
│   │   ├── page.tsx                    # Landing Page & Trading Terminal
│   │   ├── courses/                    # Course Catalog & Details
│   │   ├── about/                      # About NEW ERA Academy
│   │   ├── mentorship/                 # Group & VIP Mentorship Programs
│   │   ├── reviews/                    # Verified Reviews & Review Submission
│   │   ├── faq/                        # Searchable FAQ
│   │   ├── login/, register/           # in-house auth (server actions)
│   │   ├── forgot-password/            # Password Recovery
│   │   ├── reset-password/             # Password Reset
│   │   ├── terms/, privacy/, refund-policy/ # Legal Documents
│   ├── (student)
│   │   ├── dashboard/                  # Student Learning Hub
│   │   ├── courses/my/                 # Enrolled Courses Library
│   │   ├── course/[courseId]/          # Course Curriculum Hub
│   │   ├── lesson/[lessonId]/          # 90% Watch Detection Video Player
│   │   ├── test/[testId]/              # 90% Passing Test Stepper & XP
│   │   ├── checkout/[courseId]/        # 15-Min Timer & Receipt Upload
│   │   ├── payment/[paymentId]/        # Real-Time Order & Payment Status
│   │   ├── profile/                    # Profile Management & Avatar
│   │   ├── settings/                   # Theme, Language, Password Settings
│   │   ├── notifications/              # User Alerts Center
│   ├── (admin)
│   │   ├── admin/                      # Control Center & KPIs
│   │   ├── admin/users/                # User Management & Deep Dive
│   │   ├── admin/courses/              # Course Builder
│   │   ├── admin/modules/              # Modules Manager
│   │   ├── admin/lessons/              # Video Lesson Analytics & Uploader
│   │   ├── admin/tests/                # Test Builder (10 Questions)
│   │   ├── admin/payments/             # Manual Payment Verification Queue
│   │   ├── admin/receipts/             # Visual Receipt Gallery
│   │   ├── admin/analytics/            # Recharts Revenue & Growth Graphs
│   │   ├── admin/reviews/              # Student Review Moderation
│   │   ├── admin/faq/                  # Multilingual FAQ Editor
│   │   ├── admin/notifications/        # Alert Dispatcher
│   │   ├── admin/settings/             # Platform Settings
│   ├── api/
│   │   ├── payment/create/             # Order ID & 15-min Timer Generator
│   │   ├── payment/submit-receipt/     # Receipt Proof Submission
│   │   ├── payment/approve/            # Admin Approval & Enrollment
│   │   ├── payment/reject/             # Admin Rejection & Reason
│   │   ├── progress/                   # Video Watch Percentage
│   │   ├── test/submit/                # Server-Side Test Grading (>=90%)
├── components/                         # Reusable UI & Layout Components
├── lib/
│   ├── supabase/                       # Server, Client & Middleware clients
│   ├── validations/                    # Zod Schemas
│   ├── permissions.ts                  # Access Control & Setting Queries
│   ├── levels.ts                       # XP & Level Calculation
│   ├── i18n/                           # Multilingual System (UZ / RU / EN)
│   ├── theme/                          # Dark / Light Theme Context
├── messages/                           # uz.json, ru.json, en.json
├── schema.sql                          # Base PostgreSQL Database Schema
├── schema_v2.sql                       # Full Seed Data (25 Beginner + 25 Pro Lessons)
```

---

## ⚙️ Environment Variables

Create `.env.local` in your root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🗄️ Database & Storage Setup

1. Go to your **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Run `schema.sql` to initialize all base tables, triggers, and Row Level Security policies.
3. Run `schema_v2.sql` to insert the full **Beginner Trading (25 lessons + 25 tests)** and **PRO Trading (25 lessons + 25 tests)** curriculum, default platform settings, and FAQ entries.
4. Under **Storage**, ensure the following buckets exist:
   - `payment-receipts` (Private, Admin & Owner read)
   - `avatars` (Public)
   - `course-thumbnails` (Public)
   - `lesson-videos` (Public / Private signed URL)

5. **Grant Admin Role**:
   To assign yourself the administrator role, execute in Supabase SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'your-admin-email@domain.com';
   ```

---

## 🧪 Development Workflow

```bash
# Install dependencies
npm install

# Start local development server with Turbopack
npm run dev

# Run production build
npm run build
```

---

## 🏆 Complete Tested User Flows

1. **Registration & Login**: User registers $\rightarrow$ Supabase profile is created with default `level = 'Beginner'` and `xp = 0`.
2. **Purchase & 15-Minute Timer**: Student chooses a paid course $\rightarrow$ redirected to `/checkout/[courseId]` $\rightarrow$ 15-minute countdown starts $\rightarrow$ Order ID `NE-...` generated $\rightarrow$ User submits payment receipt screenshot $\rightarrow$ Status changes to `PENDING VERIFICATION`.
3. **Admin Verification**: Admin logs into `/admin/payments` $\rightarrow$ opens Receipt Preview Modal $\rightarrow$ clicks **Approve** $\rightarrow$ Active enrollment created $\rightarrow$ Course unlocked for student.
4. **Learning & 90% Threshold**: Student watches video lesson $\rightarrow$ progress reaches $90\%$ $\rightarrow$ `START TEST` button unlocks.
5. **Test Grading & Lesson Unlocking**: Student answers 10 questions $\rightarrow$ server evaluates score $\ge 85\%$ $\rightarrow$ $+100\text{ XP}$ awarded $\rightarrow$ Next lesson unlocks.
