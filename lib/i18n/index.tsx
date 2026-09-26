'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { messages, translate, type Locale, type TranslateParams } from '@/lib/i18n/messages';
import { persistLocale } from '@/lib/i18n/actions';

export type { Locale };
export { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/messages';

/**
 * Cookie mirroring the chosen locale.
 *
 * localStorage alone is invisible to the server, so translated course content
 * could never be resolved during rendering. The cookie is not a secret — it
 * carries a language code only — so it is deliberately readable by both sides.
 */
export const LOCALE_COOKIE = 'newera-locale';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * Mirrors the choice into the cookie the server reads.
 *
 * The server action is the one that counts — a privacy extension can silently
 * neuter `document.cookie`, and then the page would keep rendering the old
 * language forever. The local write just keeps this tab consistent until the
 * refresh lands.
 */
function writeLocaleCookie(locale: Locale) {
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Blocked by the browser — the server action below still persists it.
  }
  void persistLocale(locale);
}

export function I18nProvider({
  children,
  initialLocale = 'uz',
}: {
  children: ReactNode;
  /**
   * Locale resolved on the server from the cookie. Starting here means the
   * markup is already in the right language before hydration — without it every
   * client component renders Uzbek first and flips afterwards.
   */
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // localStorage is the older store; keep honouring it, and mirror it to the
    // cookie so the server agrees from the next request on. Without the
    // refresh, the navbar (client-rendered) flips immediately while the rest
    // of the page — already rendered server-side under the old cookie — stays
    // in the previous language until some other navigation happens to it.
    const saved = localStorage.getItem(LOCALE_COOKIE) as Locale;
    if (saved && messages[saved] && saved !== initialLocale) {
      setLocaleState(saved);
      writeLocaleCookie(saved);
      router.refresh();
    }
  }, [initialLocale, router]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_COOKIE, newLocale);
    } catch {
      // Storage blocked — the URL below still carries the choice.
    }
    writeLocaleCookie(newLocale);
    document.documentElement.lang = newLocale;

    // Reload through ?lang=, which middleware turns into both the render
    // locale and a server-set cookie. Going through the URL means the choice
    // reaches the server even when the browser refuses to keep cookies at
    // all — a soft router.refresh() would silently do nothing in that case.
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLocale);
    window.location.replace(url.toString());
  }, []);

  const t = useCallback(
    (key: string, params?: TranslateParams): string => translate(locale, key, params),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function useTranslation() {
  return useI18n();
}
