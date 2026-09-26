import { db } from '@/lib/db';
import { getCurrentProfile } from '@/lib/permissions';
import ReviewsClient from './ReviewsClient';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const profile = await getCurrentProfile();

  // Shape each review the way ReviewsClient renders it: author + course badge.
  const reviews = await Promise.all(
    (await db.getReviews({ approvedOnly: true })).map(async (review) => {
      const author = await db.getProfile(review.user_id);
      const course = await db.getCourse(review.course_id);
      return {
        ...review,
        profiles: {
          full_name: review.author_name || author?.full_name || null,
          avatar_url: author?.avatar_url || null,
          level: author?.level || null,
        },
        courses: course ? { id: course.id, title: course.title, level: course.level } : null,
      };
    })
  );

  // TZ §17/§37 — only enrolled students may leave a review.
  const userCourses = profile
    ? (
        await Promise.all(
          (await db.getEnrollments(profile.id))
            .filter((e) => e.status === 'active')
            .map((e) => db.getCourse(e.course_id))
        )
      )
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .map((c) => ({ id: c.id, title: c.title }))
    : [];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between">
      <Navbar />
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-6xl mx-auto">
          <ReviewsClient
            initialReviews={reviews}
            userCourses={userCourses}
            isAuthenticated={Boolean(profile)}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
