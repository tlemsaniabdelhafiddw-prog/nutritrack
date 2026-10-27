'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { useT } from '@/i18n/client';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config';

/** Language picker for signed-out pages; signed-in users change language in their profile. */
export function LanguageSwitcher() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft">
      <Globe className="h-4 w-4" aria-hidden />
      <span className="sr-only">{t('profile.language')}</span>
      <select
        className="bg-transparent text-ink focus:outline-none"
        value={t.locale}
        disabled={pending}
        onChange={async (e) => {
          await fetch('/api/locale', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale: e.target.value as Locale }) });
          start(() => router.refresh());
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
