import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { MASTER_ADMIN_EMAIL } from '@/lib/local-db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/action — admin-only user management (TZ §22.2).
 *
 * The master admin cannot be deleted or demoted, and an admin cannot demote
 * themselves — that would leave the platform with no way back in.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const body = await request.json();
    const { action, userId, courseId, role, xp } = body;

    if (action === 'reset_all_users') {
      if (body.confirm !== 'RESET') {
        throw new ApiError('Tasdiqlash uchun confirm: "RESET" yuboring', 400);
      }
      const remaining = await db.resetUsersToAdminOnly();
      await db.logActivity(auth.profile.id, 'reset_all_users');
      return NextResponse.json({
        success: true,
        message: `Barcha akkauntlar tozalandi. Qolgan: ${remaining.length} ta.`,
      });
    }

    if (!userId) throw new ApiError('userId kerak', 400);

    const profile = await db.getProfile(userId);
    if (!profile) throw new ApiError('Foydalanuvchi topilmadi', 404);

    const isMaster = profile.email?.toLowerCase() === MASTER_ADMIN_EMAIL;

    switch (action) {
      case 'delete_user': {
        if (isMaster) throw new ApiError('Bosh Admin akkauntini o‘chirib bo‘lmaydi', 400);
        if (profile.id === auth.profile.id) throw new ApiError('O‘z akkauntingizni o‘chira olmaysiz', 400);

        await db.deleteProfile(profile.id);
        await db.logActivity(auth.profile.id, 'user_deleted', { target: profile.id });
        return NextResponse.json({ success: true, message: 'Foydalanuvchi o‘chirildi.' });
      }

      case 'grant_course': {
        if (!courseId) throw new ApiError('courseId kerak', 400);
        const course = await db.getCourse(courseId);
        if (!course) throw new ApiError('Kurs topilmadi', 404);

        await db.saveEnrollment({
          user_id: profile.id,
          course_id: course.id,
          status: 'active',
          source: 'admin_grant',
        });

        await db.addNotification({
          user_id: profile.id,
          title: 'Kurs ochildi 🎁',
          message: `Admin sizga "${course.title}" kursini ochib berdi.`,
          type: 'course_unlocked',
          link: `/course/${course.id}`,
        });

        await db.logActivity(auth.profile.id, 'course_granted', { target: profile.id, course_id: course.id });
        return NextResponse.json({ success: true, message: 'Kurs ochib berildi.' });
      }

      case 'revoke_course': {
        if (!courseId) throw new ApiError('courseId kerak', 400);
        await db.revokeEnrollment(profile.id, courseId);
        await db.logActivity(auth.profile.id, 'course_revoked', { target: profile.id, course_id: courseId });
        return NextResponse.json({ success: true, message: 'Kursga kirish bekor qilindi.' });
      }

      case 'set_role': {
        const nextRole = role === 'admin' ? 'admin' : 'student';
        if (isMaster && nextRole !== 'admin') {
          throw new ApiError('Bosh Admin rolini o‘zgartirib bo‘lmaydi', 400);
        }
        if (profile.id === auth.profile.id && nextRole !== 'admin') {
          throw new ApiError('O‘z rolingizni tushira olmaysiz', 400);
        }

        await db.saveProfile({ id: profile.id, role: nextRole });
        await db.logActivity(auth.profile.id, 'role_changed', { target: profile.id, role: nextRole });
        return NextResponse.json({
          success: true,
          message: `Rol ${nextRole.toUpperCase()} ga o‘zgartirildi.`,
          newRole: nextRole,
        });
      }

      case 'add_xp': {
        const amount = Number(xp);
        if (!Number.isFinite(amount) || amount === 0) throw new ApiError('XP miqdori noto‘g‘ri', 400);

        const result = await db.awardXp(
          profile.id,
          amount,
          `Admin tomonidan ${amount > 0 ? 'qo‘shildi' : 'ayirildi'}`,
          'admin',
          `admin_${Date.now()}`
        );

        await db.logActivity(auth.profile.id, 'xp_adjusted', { target: profile.id, amount });
        return NextResponse.json({
          success: true,
          message: `${amount > 0 ? '+' : ''}${amount} XP qo‘llandi.`,
          newXp: result.totalXp,
        });
      }

      default:
        throw new ApiError('Noma’lum amal', 400);
    }
  } catch (error) {
    return apiError(error);
  }
}
