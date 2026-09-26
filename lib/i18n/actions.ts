'use server';

import { cookies } from 'next/headers';
import { isLocale, type Locale } from '@/lib/i18n/messages';
import { getAuth } from '@/lib/permissions';
import { db } from '@/lib/db';

/** Kept in step with lib/i18n/server.ts, which reads this cookie. */
const LOCALE_COOKIE = 'newera-locale';

/**
 * Persists the chosen language (TZ §25).
 *
 * Two stores, and both matter:
 *
 *  - The cookie, set here by the server rather than from `document.cookie`,
 *    which some privacy extensions silently neuter.
 *  - The signed-in user's profile. Every account is created with
 *    `language: 'uz'`, and getLocale() consults the profile — so without this
 *    write the switcher did nothing at all for a signed-in user: the client
 *    chrome flipped language while every Server Component kept rendering the
 *    profile's language, with no way out.
 */
export async function persistLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });

  try {
    const auth = await getAuth();
    if (auth && auth.profile.language !== locale) {
      await db.saveProfile({ id: auth.profile.id, language: locale });
    }
  } catch {
    // Signed out, or the store is unavailable — the cookie above still holds.
  }
}
