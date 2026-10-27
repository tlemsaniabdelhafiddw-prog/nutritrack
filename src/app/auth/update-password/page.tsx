import { redirect } from 'next/navigation';
import { getT } from '@/i18n/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { AuthLayout } from '@/components/auth/auth-layout';
import { UpdatePasswordForm } from '@/components/auth/auth-form';

export default async function UpdatePasswordPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect('/auth?error=callback');
  const t = await getT();
  return (
    <AuthLayout photoCredit={t('landing.photoCredit', { name: 'Anna Pelzer' })}>
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">{t('auth.resetTitle')}</h1>
      <UpdatePasswordForm />
    </AuthLayout>
  );
}
