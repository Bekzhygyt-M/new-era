export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// Row Types
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'student' | 'admin'
  level: string
  xp: number
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string | null
  short_description: string | null
  level: 'beginner' | 'pro'
  price: number
  currency: string
  thumbnail_url: string | null
  published: boolean
  featured: boolean
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
  updated_at?: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  description: string | null
  content: string | null
  video_url: string | null
  video_provider: string
  duration: number
  order_index: number
  xp_reward: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  status: 'active' | 'completed' | 'cancelled' | 'expired'
  source: 'payment' | 'admin' | 'free' | 'promotion'
  purchased_at: string
  expires_at: string | null
  created_at: string
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  watched_seconds: number
  watch_percentage: number
  completed: boolean
  test_passed: boolean
  test_score: number | null
  xp_earned: boolean
  completed_at: string | null
  updated_at: string
}

export interface Test {
  id: string
  lesson_id: string
  title: string
  created_at: string
}

export interface Question {
  id: string
  test_id: string
  question: string
  order_index: number
}

export interface Answer {
  id: string
  question_id: string
  answer: string
  is_correct: boolean
}

export interface TestAttempt {
  id: string
  user_id: string
  test_id: string
  score: number
  passed: boolean
  answers_data: Json
  started_at: string | null
  completed_at: string
}

export interface Payment {
  id: string
  user_id: string
  course_id: string | null
  order_id: string | null
  amount: number
  currency: string
  provider: string
  transaction_id?: string | null
  status: 'pending' | 'receipt_submitted' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'paid'
  receipt_url?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  comment?: string | null
  expires_at?: string | null
  submitted_at?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  approved_by?: string | null
  rejection_reason?: string | null
  created_at: string
  paid_at?: string | null
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'system' | 'course' | 'test' | 'payment' | 'announcement'
  read: boolean
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  course_id: string
  rating: number
  content: string | null
  approved: boolean
  created_at: string
}

export interface FAQItem {
  id: string
  question_uz: string
  question_ru: string | null
  question_en: string | null
  answer_uz: string
  answer_ru: string | null
  answer_en: string | null
  order_index: number
  published: boolean
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  metadata: Json
  created_at: string
}

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  certificate_number: string
  issued_at: string
}

export interface Achievement {
  id: string
  user_id: string
  achievement_type: string
  metadata: Json
  earned_at: string
}

export interface PlatformSetting {
  key: string
  value: string
  updated_at: string
}

export interface Streak {
  id: string
  user_id: string
  current_streak: number
  best_streak: number
  last_activity_date: string | null
  updated_at: string
}

// ============================================================
// Supabase Database Types
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>
        Update: Partial<Profile>
      }
      courses: {
        Row: Course
        Insert: Partial<Course> & Pick<Course, 'title' | 'slug' | 'level'>
        Update: Partial<Course>
      }
      modules: {
        Row: Module
        Insert: Partial<Module> & Pick<Module, 'course_id' | 'title' | 'order_index'>
        Update: Partial<Module>
      }
      lessons: {
        Row: Lesson
        Insert: Partial<Lesson> & Pick<Lesson, 'module_id' | 'title' | 'order_index'>
        Update: Partial<Lesson>
      }
      enrollments: {
        Row: Enrollment
        Insert: Partial<Enrollment> & Pick<Enrollment, 'user_id' | 'course_id'>
        Update: Partial<Enrollment>
      }
      lesson_progress: {
        Row: LessonProgress
        Insert: Partial<LessonProgress> & Pick<LessonProgress, 'user_id' | 'lesson_id'>
        Update: Partial<LessonProgress>
      }
      tests: {
        Row: Test
        Insert: Partial<Test> & Pick<Test, 'lesson_id' | 'title'>
        Update: Partial<Test>
      }
      questions: {
        Row: Question
        Insert: Partial<Question> & Pick<Question, 'test_id' | 'question' | 'order_index'>
        Update: Partial<Question>
      }
      answers: {
        Row: Answer
        Insert: Partial<Answer> & Pick<Answer, 'question_id' | 'answer'>
        Update: Partial<Answer>
      }
      test_attempts: {
        Row: TestAttempt
        Insert: Partial<TestAttempt> & Pick<TestAttempt, 'user_id' | 'test_id' | 'score'>
        Update: Partial<TestAttempt>
      }
      payments: {
        Row: Payment
        Insert: Partial<Payment> & Pick<Payment, 'user_id' | 'amount'>
        Update: Partial<Payment>
      }
      notifications: {
        Row: Notification
        Insert: Partial<Notification> & Pick<Notification, 'user_id' | 'title' | 'message'>
        Update: Partial<Notification>
      }
      reviews: {
        Row: Review
        Insert: Partial<Review> & Pick<Review, 'user_id' | 'course_id' | 'rating'>
        Update: Partial<Review>
      }
      faq_items: {
        Row: FAQItem
        Insert: Partial<FAQItem> & Pick<FAQItem, 'question_uz' | 'answer_uz'>
        Update: Partial<FAQItem>
      }
      activity_logs: {
        Row: ActivityLog
        Insert: Partial<ActivityLog> & Pick<ActivityLog, 'user_id' | 'action'>
        Update: Partial<ActivityLog>
      }
      certificates: {
        Row: Certificate
        Insert: Partial<Certificate> & Pick<Certificate, 'user_id' | 'course_id' | 'certificate_number'>
        Update: Partial<Certificate>
      }
      achievements: {
        Row: Achievement
        Insert: Partial<Achievement> & Pick<Achievement, 'user_id' | 'achievement_type'>
        Update: Partial<Achievement>
      }
      platform_settings: {
        Row: PlatformSetting
        Insert: PlatformSetting
        Update: Partial<PlatformSetting>
      }
      streaks: {
        Row: Streak
        Insert: Partial<Streak> & Pick<Streak, 'user_id'>
        Update: Partial<Streak>
      }
    }
  }
}

// ============================================================
// Extended Types (with joins)
// ============================================================

export interface CourseWithModules extends Course {
  modules: ModuleWithLessons[]
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[]
}

export interface LessonWithModule extends Lesson {
  modules: Module & { course_id: string }
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: Course
}

export interface ReviewWithUser extends Review {
  profiles: Pick<Profile, 'full_name' | 'avatar_url'>
}

export interface TestWithQuestions extends Test {
  questions: QuestionWithAnswers[]
}

export interface QuestionWithAnswers extends Question {
  answers: Answer[]
}
