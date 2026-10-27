import { ApiError, dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { mealUpdateInput, uuid } from '@/lib/validation';
import { buildItems, getUserTimeZone, removePhotos, resolveEatenAt, signPhotoUrls } from '@/lib/server/meals';
import { sumNutrients } from '@/lib/nutrition/portions';
import { localTimeFor } from '@/lib/dates';

type Ctx = { params: Promise<{ id: string }> };

async function loadOwnMeal(id: string) {
  const { supabase, user } = await requireUser();
  const mealId = uuid.parse(id);
  const res = await supabase.from('meals').select('*, items:meal_items(*)').eq('id', mealId).eq('user_id', user.id).maybeSingle();
  const meal = dbCheck(res, 'load meal');
  if (!meal) throw new ApiError(404, 'not_found');
  return { supabase, user, meal };
}

export const GET = route<Ctx>(async (_req, { params }) => {
  const { supabase, user, meal } = await loadOwnMeal((await params).id);
  const [urls, tz] = await Promise.all([signPhotoUrls(supabase, meal.photo_path ? [meal.photo_path] : []), getUserTimeZone(supabase, user.id)]);
  return ok({
    ...meal,
    local_time: localTimeFor(new Date(meal.eaten_at), tz),
    items: [...meal.items].sort((a, b) => a.position - b.position),
    photoUrl: meal.photo_path ? urls[meal.photo_path] ?? null : null,
  });
});

/** Replace a meal's details and items. Ownership is checked before any write. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { supabase, user, meal } = await loadOwnMeal((await params).id);
  const input = await readJson(req, mealUpdateInput);
  const tz = await getUserTimeZone(supabase, user.id);
  const items = await buildItems(supabase, input.items);
  const when = resolveEatenAt(input.date, input.time, tz);

  dbCheck(
    await supabase
      .from('meals')
      .update({ name: input.name, category: input.category, eaten_at: when.eaten_at, local_date: when.local_date, notes: input.notes ?? null })
      .eq('id', meal.id)
      .eq('user_id', user.id),
    'update meal',
  );

  // Swap items: insert the new set first, then delete the old rows, so a failure never leaves an empty meal.
  const oldIds = meal.items.map((i) => i.id);
  dbCheck(await supabase.from('meal_items').insert(items.map((i) => ({ ...i, meal_id: meal.id, user_id: user.id }))), 'insert items');
  if (oldIds.length) dbCheck(await supabase.from('meal_items').delete().in('id', oldIds).eq('user_id', user.id), 'delete old items');

  return ok({ id: meal.id, local_date: when.local_date, totals: sumNutrients(items) });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { supabase, user, meal } = await loadOwnMeal((await params).id);
  dbCheck(await supabase.from('meals').delete().eq('id', meal.id).eq('user_id', user.id), 'delete meal');
  if (meal.photo_path) await removePhotos(supabase, [meal.photo_path]);
  return ok({ deleted: true });
});
