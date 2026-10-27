import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getLocale, MESSAGES, getT } from '@/i18n/server';
import { dirFor } from '@/i18n/config';
import { I18nProvider } from '@/i18n/client';
import { ToastProvider } from '@/components/ui/toast';
import en from '@/i18n/messages/en';

export const metadata: Metadata = {
  title: { default: 'NutriTrack', template: '%s · NutriTrack' },
  description: 'Photograph meals, review AI nutrition estimates, and track your day with recipes from the Mediterranean and North Africa.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#fef5f3',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getT();
  return (
    <html lang={locale} dir={dirFor(locale)}>
      <body>
        <a href="#content" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
          {t('nav.skipToContent')}
        </a>
        <I18nProvider locale={locale} messages={MESSAGES[locale]} fallback={en}>
          <ToastProvider dismissLabel={t('common.close')}>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
