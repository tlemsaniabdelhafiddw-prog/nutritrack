import { ApiError, dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { plannedMealUpdate, uuid } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

/** Move to another day/meal or change servings. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const input = await readJson(req, plannedMealUpdate);
  const row = dbCheck(await supabase.from('planned_meals').update(input).eq('id', id).eq('user_id', user.id).select('*').maybeSingle(), 'update plan');
  if (!row) throw new ApiError(404, 'not_found');
  return ok({ planned: row });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const res = dbCheck(await supabase.from('planned_meals').delete().eq('id', id).eq('user_id', user.id).select('id'), 'delete plan');
  if (!res?.length) throw new ApiError(404, 'not_found');
  return ok({ deleted: true });
});
