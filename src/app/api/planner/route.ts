import { ApiError, dbCheck, dbOne, ok, readJson, requireUser, route } from '@/lib/api';
import { localDate, plannedMealInput } from '@/lib/validation';
import { addDays, startOfWeek } from '@/lib/dates';

export const GET = route(async (req) => {
  const { supabase, user } = await requireUser();
  const week = startOfWeek(localDate.parse(new URL(req.url).searchParams.get('week') ?? ''));
  const rows = dbCheck(
    await supabase
      .from('planned_meals')
      .select('*, recipe:recipes(id, slug, title, title_fr, title_ar, image_url, servings, kcal_per_serving)')
      .eq('user_id', user.id)
      .gte('plan_date', week)
      .lte('plan_date', addDays(week, 6))
      .order('plan_date'),
    'load plan',
  );
  return ok({ week, planned: rows });
});

/** Adds a recipe to the plan. Planned meals are never counted as eaten. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const input = await readJson(req, plannedMealInput);
  const recipe = await supabase.from('recipes').select('id').eq('id', input.recipe_id).maybeSingle();
  if (!recipe.data) throw new ApiError(404, 'not_found');
  const row = dbOne(await supabase.from('planned_meals').insert({ ...input, user_id: user.id }).select('*').single(), 'add plan');
  return ok({ planned: row }, { status: 201 });
});
