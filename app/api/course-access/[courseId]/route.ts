import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/permissions';
import { getCourseAccess } from '@/lib/payments/service';
import { rateLimit } from '@/lib/rate-limit';
import { isSafeInviteUrl } from '@/lib/telegram/channel-access';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Never let a browser, proxy or CDN keep a per-user redirect. */
const PRIVATE = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

function to(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303, headers: PRIVATE });
}

/**
 * GET /api/course-access/<courseId>
 *
 * The single "Darslarga o‘tish" endpoint. A plain top-level link to this URL
 * is the whole client-side mechanism — no fetch(), no window.open(), nothing a
 * popup blocker or client router can swallow. The server decides and answers
 * with one 303:
 *
 *   signed out                     → /login?returnTo=/dashboard
 *   Telegram course, has access    → the buyer's own private invite (t.me/+…)
 *   web course, has access         → /course/<id>
 *   no / expired access, or error  → /dashboard?access=<reason>&course=<id>
 *
 * Ownership: the user comes ONLY from the verified session; the course id from
 * the URL can only select among that user's own enrollments and payments
 * (enforced inside getCourseAccess). An admin opening this URL is treated like
 * any other user — without their own enrollment they get no invite, so an
 * admin can never mint or consume a buyer's seat.
 *
 * `?retry=1` is the recovery path for a link Telegram no longer accepts
 * (already used, revoked): the stored invite is revoked and exactly one new
 * one is issued. It is rate-limited per user.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const auth = await getAuth();
  if (!auth) return to(request, `/login?returnTo=${encodeURIComponent('/dashboard')}`);

  if (!UUID.test(courseId)) return to(request, '/dashboard?access=no_access');

  const replace = new URL(request.url).searchParams.get('retry') === '1';
  // Bounded either way: ordinary clicks reuse the stored link (no Telegram
  // call); a forced replacement mints a new one, so it is held much tighter.
  const limit = replace
    ? rateLimit(`course-access:replace:${auth.profile.id}:${courseId}`, 3, 60 * 60 * 1000)
    : rateLimit(`course-access:${auth.profile.id}`, 30, 60 * 1000);
  if (!limit.ok) return to(request, `/dashboard?access=rate_limited&course=${courseId}`);

  const decision = await getCourseAccess(auth.profile.id, courseId, { mint: true, replace });

  if (!decision.ok) return to(request, `/dashboard?access=${decision.reason}&course=${courseId}`);

  if (decision.delivery === 'web') return to(request, decision.href);

  // Last line of defence: only ever redirect to a private Telegram invite.
  if (!isSafeInviteUrl(decision.href)) {
    console.error('[course-access] refused to redirect to a non-invite URL for course', courseId);
    return to(request, `/dashboard?access=telegram_error&course=${courseId}`);
  }

  return NextResponse.redirect(decision.href, { status: 303, headers: PRIVATE });
}
