import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().email('Email manzili noto‘g‘ri') });

/**
 * POST /api/auth/forgot-password — opens an admin-approved reset (TZ §9).
 *
 * The response is deliberately identical whether or not the account exists, so
 * this endpoint cannot be used to enumerate registered emails (TZ §29).
 * The request itself is only recorded here; an admin approves it at
 * /admin/password-resets, which is what mints the one-time link.
 */
export async function POST(request: NextRequest) {
  const generic = NextResponse.json({
    success: true,
    message:
      'So‘rov qabul qilindi. Administrator shaxsingizni tekshirib, parolni tiklash havolasini yuboradi.',
  });

  const ip = clientIp(request.headers);
  const limit = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Juda ko‘p urinish. ${Math.ceil(limit.retryAfterSeconds / 60)} daqiqadan so‘ng qayta urinib ko‘ring.`,
      },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const profile = await db.getProfile(parsed.data.email);
  if (!profile) return generic;

  const resetRequest = await db.createPasswordReset(profile.id, profile.email);
  await db.logActivity(profile.id, 'password_reset_requested', { request_id: resetRequest.id });

  // Surface it to the admins in the notification bell; the queue page is the
  // authority, so a failed notification never loses the request (TZ §30).
  try {
    const admins = (await db.getProfiles()).filter((p) => p.role === 'admin');
    await Promise.all(
      admins.map((admin) =>
        db.addNotification({
          user_id: admin.id,
          title: 'Parolni tiklash so‘rovi',
          message: `${profile.email} parolni tiklashni so‘radi. Tasdiqlash uchun so‘rovlar ro‘yxatiga o‘ting.`,
          type: 'password_reset',
          link: '/admin/password-resets',
        })
      )
    );
  } catch (error) {
    console.error('[auth] password reset notification failed:', error);
  }

  return generic;
}
