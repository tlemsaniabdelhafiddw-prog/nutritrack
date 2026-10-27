'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createTranslator, type Translator } from './translate';
import type { Locale } from './config';
import type { Messages } from './messages/en';

const I18nContext = createContext<Translator | null>(null);

export function I18nProvider({ locale, messages, fallback, children }: { locale: Locale; messages: Messages; fallback: Messages; children: ReactNode }) {
  const t = useMemo(() => createTranslator(locale, messages, fallback), [locale, messages, fallback]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): Translator {
  const t = useContext(I18nContext);
  if (!t) throw new Error('useT must be used inside I18nProvider');
  return t;
}
