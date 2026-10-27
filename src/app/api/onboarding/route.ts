import { cookies } from 'next/headers';
import { dbCheck, dbOne, ok, readJson, requireUser, route } from '@/lib/api';
import { onboardingInput } from '@/lib/validation';
import { saveTargets } from '@/lib/server/targets';
import { localDateFor } from '@/lib/dates';
import { LOCALE_COOKIE } from '@/i18n/config';

/** Completes onboarding: profile, preferences, first targets and a first weigh-in. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { profile, preferences, targets } = await readJson(req, onboardingInput);

  const savedProfile = dbOne(
    await supabase
      .from('profiles')
      .update({ ...profile, onboarded_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('*')
      .single(),
    'update profile',
  );
  dbCheck(await supabase.from('user_preferences').update(preferences).eq('user_id', user.id), 'update preferences');

  const savedTargets = await saveTargets(supabase, user.id, savedProfile, targets);

  const today = localDateFor(new Date(), profile.timezone);
  dbCheck(
    await supabase
      .from('weight_entries')
      .upsert({ user_id: user.id, measured_on: today, weight_kg: profile.weight_kg }, { onConflict: 'user_id,measured_on' }),
    'first weight',
  );

  (await cookies()).set(LOCALE_COOKIE, profile.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return ok({ profile: savedProfile, targets: savedTargets });
});
