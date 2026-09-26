import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';
import { getAuth } from '@/lib/permissions';
import { db } from '@/lib/db';

export async function POST() {
  const auth = await getAuth();
  if (auth) await db.logActivity(auth.profile.id, 'logout');
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
