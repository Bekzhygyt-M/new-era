import AdminReviewsClient from './AdminReviewsClient';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  await requireAdminPage();

  // Real reviews, shaped for the moderation table (TZ §22, §31).
  const reviews = await Promise.all(
    (await db.getReviews()).map(async (review) => {
      const author = await db.getProfile(review.user_id);
      const course = await db.getCourse(review.course_id);
      return {
        ...review,
        profiles: {
          id: author?.id || review.user_id,
          full_name: review.author_name || author?.full_name || null,
          email: author?.email || null,
        },
        courses: course ? { id: course.id, title: course.title } : null,
      };
    })
  );


  return (
    <div className="space-y-8">
      <AdminReviewsClient initialReviews={reviews} />
    </div>
  );
}
