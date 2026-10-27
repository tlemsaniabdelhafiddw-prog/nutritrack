import { getT } from '@/i18n/server';
import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Sign in' };

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  return (
    <AuthLayout photoCredit={t('landing.photoCredit', { name: 'Anna Pelzer' })}>
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">{t('auth.title')}</h1>
      <AuthForm next={sp.next ?? null} initialError={sp.error === 'callback' ? t('auth.callbackError') : null} />
    </AuthLayout>
  );
}
