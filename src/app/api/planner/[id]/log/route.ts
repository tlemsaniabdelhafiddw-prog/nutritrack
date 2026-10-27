import { z } from 'zod';
import { ApiError, dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { timeOfDay, uuid } from '@/lib/validation';
import { logRecipe } from '@/lib/server/recipe-log';
import { getLocale } from '@/i18n/server';

type Ctx = { params: Promise<{ id: string }> };

const body = z.object({ time: timeOfDay });

/** Logs a planned recipe as eaten on its planned day; only then does it count in the diary. */
export const POST = route<Ctx>(async (req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const { time } = await readJson(req, body);
  const plan = dbCheck(await supabase.from('planned_meals').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(), 'load plan');
  if (!plan) throw new ApiError(404, 'not_found');
  if (plan.logged_meal_id) return ok({ id: plan.logged_meal_id, duplicate: true });

  const result = await logRecipe(supabase, user.id, {
    recipeId: plan.recipe_id,
    servings: Number(plan.servings),
    category: plan.category,
    date: plan.plan_date,
    time,
    // The planned meal's id makes repeated clicks idempotent.
    clientRequestId: plan.id,
    locale: await getLocale(),
  });
  dbCheck(await supabase.from('planned_meals').update({ logged_meal_id: result.id }).eq('id', id).eq('user_id', user.id), 'link plan');
  return ok(result, { status: 201 });
});
