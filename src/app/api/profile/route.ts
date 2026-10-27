import { cookies } from 'next/headers';
import { z } from 'zod';
import { dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { preferencesInput, profileInput } from '@/lib/validation';
import { LOCALE_COOKIE } from '@/i18n/config';

const body = z.object({ profile: profileInput.optional(), preferences: preferencesInput.optional() });

export const PATCH = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { profile, preferences } = await readJson(req, body);
  if (profile) {
    dbCheck(await supabase.from('profiles').update(profile).eq('id', user.id), 'update profile');
    (await cookies()).set(LOCALE_COOKIE, profile.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  if (preferences) dbCheck(await supabase.from('user_preferences').update(preferences).eq('user_id', user.id), 'update preferences');
  return ok({ saved: true });
});
