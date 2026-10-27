import type { Locale } from '@/i18n/config';

/** Picks the localized column (title_fr, body_ar…) and falls back to English. */
export function localized<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string {
  if (locale !== 'en') {
    const v = row[`${field}_${locale}`];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return String(row[field] ?? '');
}
