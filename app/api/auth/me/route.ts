import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/permissions';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — the signed-in user, derived from the verified session. */
export async function GET() {
  const auth = await getAuth();

  if (!auth) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const { profile } = auth;
  const unread = (await db.getNotifications(profile.id)).filter((n) => !n.read).length;

  return NextResponse.json({
    authenticated: true,
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      isAdmin: auth.isAdmin,
      xp: profile.xp || 0,
      level: profile.level || 'Beginner',
      avatar_url: profile.avatar_url || null,
      language: profile.language || 'uz',
      theme: profile.theme || 'dark',
      unreadNotifications: unread,
    },
  });
}
