import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from './config';
import { createTranslator } from './translate';
import en, { type Messages } from './messages/en';
import fr from './messages/fr';
import ar from './messages/ar';

export const MESSAGES: Record<Locale, Messages> = { en, fr, ar };

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  return negotiateLocale(h.get('accept-language')) ?? DEFAULT_LOCALE;
});

export const getT = cache(async () => {
  const locale = await getLocale();
  return createTranslator(locale, MESSAGES[locale], en);
});
