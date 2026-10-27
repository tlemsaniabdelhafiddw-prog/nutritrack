import { ApiError, dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { targetsInput } from '@/lib/validation';
import { saveTargets } from '@/lib/server/targets';
import { z } from 'zod';

const body = z.object({ targets: targetsInput.nullable() });

/** Saves custom targets, or recalculates from the profile when targets is null. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const { targets } = await readJson(req, body);
  const profile = dbCheck(await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(), 'load profile');
  if (!profile) throw new ApiError(404, 'not_found');
  const row = await saveTargets(supabase, user.id, profile, targets);
  return ok({ targets: row });
});
