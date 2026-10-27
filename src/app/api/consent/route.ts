import { dbCheck, ok, requireUser, route } from '@/lib/api';

/** Records or withdraws consent to send meal photos to the AI provider. */
export const POST = route(async () => {
  const { supabase, user } = await requireUser();
  const at = new Date().toISOString();
  dbCheck(await supabase.from('profiles').update({ ai_photo_consent_at: at }).eq('id', user.id), 'consent');
  return ok({ ai_photo_consent_at: at });
});

export const DELETE = route(async () => {
  const { supabase, user } = await requireUser();
  dbCheck(await supabase.from('profiles').update({ ai_photo_consent_at: null }).eq('id', user.id), 'withdraw consent');
  return ok({ ai_photo_consent_at: null });
});
