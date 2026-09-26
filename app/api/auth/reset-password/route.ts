import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, hashToken } from '@/lib/auth/password';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  token: z.string().min(1, 'Havola yaroqsiz'),
  password: z.string().min(8, 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak'),
});

/** POST /api/auth/reset-password — consumes a one-time token (TZ §9). */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
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

  const resetRequest = await db.findValidPasswordReset(hashToken(parsed.data.token));
  if (!resetRequest) {
    return NextResponse.json(
      { error: 'Havola yaroqsiz yoki muddati tugagan. Yangi so‘rov yuboring.' },
      { status: 400 }
    );
  }

  const profile = await db.getProfile(resetRequest.user_id);
  if (!profile) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
  }

  await db.saveProfile({ id: profile.id, password_hash: await hashPassword(parsed.data.password) });
  await db.consumePasswordReset(resetRequest.id);
  await db.logActivity(profile.id, 'password_reset_completed', { request_id: resetRequest.id });

  return NextResponse.json({ success: true });
}
