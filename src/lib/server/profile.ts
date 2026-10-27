import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, type ServerSupabase } from '../supabase/server';
import type { Tables } from '../supabase/database.types';
import { safeTimeZone } from '../dates';

export type ProfileBundle = {
  profile: Tables<'profiles'>;
  preferences: Tables<'user_preferences'>;
  targets: Tables<'nutrition_targets'> | null;
};

export async function loadProfileBundle(supabase: ServerSupabase, userId: string): Promise<ProfileBundle | null> {
  const [p, pref, t] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('nutrition_targets').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!p.data || !pref.data) return null;
  return { profile: p.data, preferences: pref.data, targets: t.data ?? null };
}

/**
 * For pages inside the signed-in app. Redirects to /auth when signed out and to
 * /onboarding until the profile is complete.
 */
export const requireAppUser = cache(async () => {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect('/auth');
  const bundle = await loadProfileBundle(supabase, user.id);
  if (!bundle || !bundle.profile.onboarded_at) redirect('/onboarding');
  return { supabase, user, ...bundle, timeZone: safeTimeZone(bundle.profile.timezone) };
});
