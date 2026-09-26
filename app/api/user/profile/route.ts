import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError } from '@/lib/permissions';
import { setSessionCookie } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { profileUpdateSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile } = await requireUserApi();
    // password_hash must never leave the server.
    const { password_hash, ...safe } = profile;
    return NextResponse.json({ profile: safe });
  } catch (error) {
    return apiError(error);
  }
}

/** POST /api/user/profile — updates the caller's own profile only. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const body = await request.json();

    const parsed = profileUpdateSchema.safeParse({
      full_name: body.full_name ?? auth.profile.full_name,
      phone: body.phone ?? auth.profile.phone,
      language: body.language ?? auth.profile.language,
      theme: body.theme ?? auth.profile.theme,
      avatar_url: body.avatar_url ?? auth.profile.avatar_url,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    // Role, XP and level are not user-editable.
    const updated = await db.saveProfile({
      id: auth.profile.id,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? undefined,
      language: parsed.data.language ?? undefined,
      theme: parsed.data.theme ?? undefined,
      avatar_url: parsed.data.avatar_url ?? undefined,
    });

    // Refresh the session so the displayed name stays in step.
    await setSessionCookie({
      sub: updated.id,
      email: updated.email,
      role: updated.role,
      name: updated.full_name,
    });

    const { password_hash, ...safe } = updated;
    return NextResponse.json({ success: true, profile: safe });
  } catch (error) {
    return apiError(error);
  }
}
