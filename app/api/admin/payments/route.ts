import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/admin/payments?status=&q= — the verification queue (TZ §22.8). */
export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    await db.expireStalePayments();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();

    let payments = await db.getPayments();

    if (status !== 'all') {
      payments = payments.filter((p) => p.status === status);
    }

    if (query) {
      payments = payments.filter((p) => {
        const haystack = [
          p.order_id,
          p.first_name,
          p.last_name,
          p.phone,
          p.profiles?.email,
          p.profiles?.full_name,
          p.courses?.title,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    const all = await db.getPayments();

    return NextResponse.json({
      success: true,
      payments,
      counts: {
        all: all.length,
        pending: all.filter((p) => p.status === 'pending').length,
        receipt_submitted: all.filter((p) => p.status === 'receipt_submitted').length,
        approved: all.filter((p) => p.status === 'approved').length,
        rejected: all.filter((p) => p.status === 'rejected').length,
        expired: all.filter((p) => p.status === 'expired').length,
        cancelled: all.filter((p) => p.status === 'cancelled').length,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

/** POST /api/admin/payments — manually create and approve a student payment. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const body = await request.json();

    const {
      courseId,
      amount,
      provider = 'manual',
      firstName = 'Treyder',
      lastName = '',
      phone = '',
      email = '',
      status = 'approved',
      comment = 'Admin tomonidan qo‘lda yaratildi',
    } = body;

    const course = await db.getCourse(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Kurs topilmadi' }, { status: 404 });
    }

    // Look up or create profile
    let profile = null;
    if (email) {
      profile = await db.getProfile(email);
    }
    if (!profile && phone) {
      const allProfiles = await db.getProfiles();
      profile = allProfiles.find((p) => p.phone && p.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) || null;
    }

    if (!profile) {
      // Create user profile for student
      const userEmail = email.trim() || `student_${Date.now()}@newera.uz`;
      profile = await db.saveProfile({
        email: userEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        role: 'student',
        level: 'Beginner',
        xp: 0,
      });
    }

    const orderId = `NE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

    const payment = await db.savePayment({
      user_id: profile.id,
      course_id: course.id,
      amount: Number(amount) || course.price,
      currency: course.currency || 'UZS',
      provider,
      status: status || 'approved',
      first_name: firstName,
      last_name: lastName,
      phone,
      comment,
      order_id: orderId,
      receipt_url: '/api/receipt/manual-admin.png',
      submitted_at: new Date().toISOString(),
      approved_at: status === 'approved' ? new Date().toISOString() : undefined,
      approved_by: status === 'approved' ? auth.profile.id : undefined,
    });

    if (status === 'approved') {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db.saveEnrollment({
        user_id: profile.id,
        course_id: course.id,
        status: 'active',
        source: 'manual',
        expires_at: expiresAt,
      });

      await db.addNotification({
        user_id: profile.id,
        title: 'Kurs faollashtirildi ✅',
        message: `Admin tomonidan "${course.title}" kursi 30 kunga faollashtirildi.`,
        type: 'payment_approved',
        link: `/course/${course.id}`,
      });
    }

    await db.logActivity(auth.profile.id, 'manual_payment_created', {
      payment_id: payment.id,
      user_id: profile.id,
      course_id: course.id,
      amount: payment.amount,
      status,
    });

    return NextResponse.json({
      success: true,
      payment,
      profile,
    });
  } catch (error) {
    return apiError(error);
  }
}
