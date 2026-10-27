import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { loadProfileBundle } from '@/lib/server/profile';
import { getLocale, getT } from '@/i18n/server';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { Logo } from '@/components/app/logo';
import type { ActivityLevel, Goal, Sex } from '@/lib/nutrition/calc';

export const metadata = { title: 'Set up your profile' };

export default async function OnboardingPage() {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect('/auth?next=/onboarding');
  const bundle = await loadProfileBundle(supabase, user.id);
  if (bundle?.profile.onboarded_at) redirect('/dashboard');
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const p = bundle?.profile;
  const pref = bundle?.preferences;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Logo className="mb-8 h-7" priority />
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">{t('onboarding.title')}</h1>
      <OnboardingWizard
        today={new Date().toISOString().slice(0, 10)}
        initial={{
          display_name: p?.display_name ?? '',
          date_of_birth: p?.date_of_birth ?? '',
          sex: (p?.sex as Sex) ?? null,
          height_cm: p?.height_cm ? Number(p.height_cm) : null,
          weight_kg: p?.weight_kg ? Number(p.weight_kg) : null,
          target_weight_kg: p?.target_weight_kg ? Number(p.target_weight_kg) : null,
          activity_level: (p?.activity_level as ActivityLevel) ?? null,
          goal: (p?.goal as Goal) ?? null,
          units: p?.units === 'imperial' ? 'imperial' : 'metric',
          locale,
          dietary_preferences: pref?.dietary_preferences ?? [],
          allergies: pref?.allergies ?? [],
          restrictions_note: pref?.restrictions_note ?? '',
        }}
      />
    </div>
  );
}
