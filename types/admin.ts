/**
 * View models for the admin and public client components.
 *
 * Every shape here mirrors what a server component or an /api/admin/* route
 * actually sends, so the clients can drop `any` without inventing fields.
 */

import type {
  LocalCourse,
  LocalLesson,
  LocalModule,
  LocalProfile,
  LocalPayment,
  LocalNotification,
  LocalReview,
  LocalFaq,
  LocalTest,
  LocalLessonProgress,
  LocalTestAttempt,
} from '@/lib/local-db';

export type {
  LocalCourse,
  LocalLesson,
  LocalModule,
  LocalProfile,
  LocalPayment,
  LocalNotification,
  LocalReview,
  LocalFaq,
  LocalTest,
  LocalLessonProgress,
  LocalTestAttempt,
};

/** A course row carrying its modules and their lessons (course editor). */
export interface AdminCourseDetail extends LocalCourse {
  modules: (LocalModule & { lessons: LocalLesson[] })[];
}

/** A lesson row joined to its module and course (lesson list). */
export interface AdminLessonRow extends LocalLesson {
  /** True when a test is attached to this lesson. */
  hasTest?: boolean;
  modules: {
    id: string;
    title: string;
    course_id: string;
    courses: { id: string; title: string; level: string } | null;
  } | null;
}

/** The module picker options used by the lesson create/edit screens. */
export interface AdminModuleOption {
  id: string;
  title: string;
  course_id?: string;
  courses?: { id?: string; title?: string | null; level?: string | null } | null;
}

/** A lesson option in the test builder's lesson picker. */
export interface AdminLessonOption {
  id: string;
  title: string;
  module_id?: string | null;
  moduleTitle?: string | null;
  courseTitle?: string | null;
  hasTest?: boolean;
}

/** One answer inside the test builder. */
export interface TestAnswerDraft {
  id?: string;
  answer: string;
  is_correct: boolean;
}

/** One question inside the test builder. */
export interface TestQuestionDraft {
  id?: string;
  question: string;
  order_index?: number;
  points?: number;
  multiple?: boolean;
  answers: TestAnswerDraft[];
}

/** A test together with the questions the editor loaded. */
export interface AdminTestDetail extends Partial<LocalTest> {
  id?: string;
  title: string;
  questions?: TestQuestionDraft[];
}

/** A review shaped for display: author and course resolved. */
export interface ReviewWithAuthor extends LocalReview {
  profiles?: {
    id?: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    level?: string | null;
  } | null;
  courses?: { id: string; title: string; level?: string } | null;
}

/** The signed-in user as returned by /api/auth/me. */
export interface CurrentUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  isAdmin: boolean;
  xp?: number;
  level?: string;
  avatar_url?: string | null;
  language?: string;
  theme?: string;
  unreadNotifications?: number;
}

/** A course the student is enrolled in, as listed on /courses/my. */
export interface EnrolledCourse {
  id: string;
  courses: LocalCourse | null;
}
