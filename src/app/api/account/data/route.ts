import { z } from 'zod';
import { ok, readJson, requireUser, route } from '@/lib/api';
import { deleteNutritionData } from '@/lib/server/account';

/** Deletes meals, photos, weigh-ins, water, plans, favorites and targets; keeps the account. */
export const DELETE = route(async (req) => {
  const { supabase, user } = await requireUser();
  await readJson(req, z.object({ confirm: z.literal('DELETE') }));
  await deleteNutritionData(supabase, user.id);
  return ok({ deleted: true });
});
