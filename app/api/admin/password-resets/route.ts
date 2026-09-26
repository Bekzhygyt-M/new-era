import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { randomToken, hashToken } from '@/lib/auth/password';
import { appConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Minutes a reset link stays valid once approved. */
const RESET_TTL_MINUTES = 30;

/** GET — the reset queue, newest first (TZ §9). */
export async function GET() {
  try {
    await requireAdminApi();

    const requests = (await db.raw()).password_resets
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100)
      // The token hash never leaves the server.
      .map(({ token_hash: _hash, ...rest }) => ({
        ...rest,
        expired: Boolean(rest.expires_at && new Date(rest.expires_at).getTime() < Date.now()),
      }));

    return NextResponse.json({ requests, ttlMinutes: RESET_TTL_MINUTES });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * POST — approve or reject one request.
 *
 * Approving mints a single-use token and returns the link exactly once; only
 * its SHA-256 hash is stored, so the link cannot be recovered afterwards. The
 * admin is responsible for handing it to a user whose identity they verified.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const { id, action } = await request.json();

    if (!id) throw new ApiError('id kerak', 400);

    if (action === 'reject') {
      const ok = await db.rejectPasswordReset(id);
      if (!ok) throw new ApiError('So‘rov allaqachon yopilgan yoki topilmadi', 409);
      await db.logActivity(auth.profile.id, 'password_reset_rejected', { request_id: id });
      return NextResponse.json({ success: true });
    }

    if (action !== 'approve') throw new ApiError('Noma’lum amal', 400);

    const token = randomToken(32);
    const approved = await db.approvePasswordReset(id, hashToken(token), RESET_TTL_MINUTES);
    if (!approved) throw new ApiError('So‘rov allaqachon yopilgan yoki topilmadi', 409);

    await db.logActivity(auth.profile.id, 'password_reset_approved', { request_id: id });

    return NextResponse.json({
      success: true,
      email: approved.email,
      expiresAt: approved.expires_at,
      ttlMinutes: RESET_TTL_MINUTES,
      // Shown once, never stored in a readable form.
      link: `${appConfig.siteUrl}/reset-password?token=${token}`,
    });
  } catch (error) {
    return apiError(error);
  }
}
