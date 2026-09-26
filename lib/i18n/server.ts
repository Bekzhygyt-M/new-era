import { cookies, headers } from 'next/headers';
import { getCurrentProfile } from '@/lib/permissions';
import { translatorFor, type Locale, type Translator } from '@/lib/i18n/messages';

export const LOCALE_COOKIE = 'newera-locale';
/** Set by middleware when the URL carries ?lang= — see middleware.ts. */
const LOCALE_HEADER = 'x-newera-locale';
export const DEFAULT_LOCALE: Locale = 'uz';

const SUPPORTED: Locale[] = ['uz', 'ru', 'en'];

function parse(value?: string | null): Locale | null {
  return SUPPORTED.includes(value as Locale) ? (value as Locale) : null;
}

/**
 * Active locale for server rendering (TZ §25).
 *
 * Order matters, most deliberate first:
 *  1. `?lang=` in the URL — chosen right now, and the only channel that still
 *     works when the browser refuses to keep cookies.
 *  2. The locale cookie — an explicit switch made on this device.
 *  3. The signed-in student's stored preference.
 *  4. Uzbek.
 *
 * The cookie sits above the profile deliberately. Accounts are created with
 * `language: 'uz'`, so with the profile first a signed-in user's switch was
 * overruled on every render and the interface could never leave Uzbek.
 *
 * Never throws: content must render even when the request carries no
 * preference at all.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await headers();
    const fromUrl = parse(store.get(LOCALE_HEADER));
    if (fromUrl) return fromUrl;
  } catch {
    // No request headers available — fall through.
  }

  try {
    const store = await cookies();
    const fromCookie = parse(store.get(LOCALE_COOKIE)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    // No cookie store on this request — fall through to the profile.
  }

  try {
    const profile = await getCurrentProfile();
    const fromProfile = parse(profile?.language);
    if (fromProfile) return fromProfile;
  } catch {
    // Unauthenticated or store unavailable — fall through to the default.
  }

  return DEFAULT_LOCALE;
}

/** Locale plus a ready translator, for Server Components (TZ §25). */
export async function getTranslations(): Promise<{ locale: Locale; t: Translator }> {
  const locale = await getLocale();
  return { locale, t: translatorFor(locale) };
}
