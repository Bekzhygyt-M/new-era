import { type NextRequest, NextResponse } from 'next/server';
import { decodeSessionUnverified } from '@/lib/auth/session-payload';

/**
 * Edge-level routing guard.
 *
 * This is a fast first pass only — it keeps signed-out users off private pages
 * and signed-in users off /login. Real authorization always happens again on
 * the server (see lib/permissions.ts), because middleware cannot read the
 * database to confirm the current role.
 */

/**
 * Language override via `?lang=`.
 *
 * The cookie is the normal mechanism, but a browser can refuse to store it
 * (strict privacy settings, an extension neutering document.cookie). The URL
 * always reaches the server, so this path works even then: the locale is
 * forwarded to the render as a request header AND written back as a cookie
 * for the next navigation.
 *
 * Listed here rather than imported so the edge bundle stays free of the
 * message dictionaries.
 */
const LOCALES = ['uz', 'ru', 'en'];
const LOCALE_COOKIE = 'newera-locale';
const LOCALE_HEADER = 'x-newera-locale';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/profile',
  '/settings',
  '/lesson',
  '/test',
  '/course',
  '/courses/my',
  '/journal',
  '/backtest',
  '/statistics',
  '/notifications',
  '/messages',
  '/checkout',
  '/payment',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and health checks never need a session lookup.
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/health') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const requestedLocale = request.nextUrl.searchParams.get('lang');
  const localeOverride = requestedLocale && LOCALES.includes(requestedLocale) ? requestedLocale : null;

  // Decode only — see lib/auth/session-payload.ts. Authorization is re-done
  // server-side by lib/permissions on every protected route.
  const session = decodeSessionUnverified(request.cookies.get('newera_session')?.value);

  // Note: signed-in users are NOT bounced off /login here.
  //
  // Middleware cannot verify the signature (the secret is unreachable from the
  // edge), so a stale or forged cookie would look valid, redirect to /dashboard,
  // and be rejected there — sending the visitor back to /login forever. The
  // bounce is done by the pages themselves, which can verify properly.

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?returnTo=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Cheap pre-filter for the admin area; requireAdminPage() is still the
  // authority and re-checks the role against the database.
  if (pathname.startsWith('/admin') && session && session.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '?error=forbidden';
    return NextResponse.redirect(url);
  }

  // Hand the override to the render through a request header, so this very
  // page comes back in the chosen language without depending on the cookie.
  const response = localeOverride
    ? NextResponse.next({
        request: {
          headers: (() => {
            const headers = new Headers(request.headers);
            headers.set(LOCALE_HEADER, localeOverride);
            return headers;
          })(),
        },
      })
    : NextResponse.next();

  if (localeOverride) {
    // Server-set, so an extension that blocks document.cookie cannot stop it.
    response.cookies.set(LOCALE_COOKIE, localeOverride, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Baseline security headers (TZ §29).
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|mp4|webm|mov|ogg|mp3|wav)$).*)',
  ],
};
