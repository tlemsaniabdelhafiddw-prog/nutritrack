import { z } from 'zod';
import { dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { localDate } from '@/lib/validation';
import { addDays, startOfWeek } from '@/lib/dates';
import { buildShoppingList, type PlannedIngredient } from '@/lib/shopping';
import { localized } from '@/lib/server/recipes';
import { getLocale } from '@/i18n/server';

const body = z.object({ week: localDate });

/** Rebuilds the week's shopping list from planned recipes, merging duplicate ingredients. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const week = startOfWeek((await readJson(req, body)).week);
  const locale = await getLocale();

  const plans = dbCheck(
    await supabase
      .from('planned_meals')
      .select('servings, recipe:recipes(servings, ingredients:recipe_ingredients(food_id, name, name_fr, name_ar, quantity, unit, grams))')
      .eq('user_id', user.id)
      .gte('plan_date', week)
      .lte('plan_date', addDays(week, 6)),
    'load plan',
  );

  const ingredients: PlannedIngredient[] = [];
  for (const p of plans ?? []) {
    const r = p.recipe;
    if (!r) continue;
    for (const ing of r.ingredients ?? []) {
      ingredients.push({
        foodId: ing.food_id,
        name: localized(ing, 'name', locale),
        quantity: Number(ing.quantity),
        unit: ing.unit,
        grams: Number(ing.grams),
        scale: Number(p.servings) / r.servings,
      });
    }
  }
  const lines = buildShoppingList(ingredients);

  dbCheck(await supabase.from('shopping_list_items').delete().eq('user_id', user.id).eq('week_start', week), 'clear list');
  if (lines.length) {
    dbCheck(
      await supabase
        .from('shopping_list_items')
        .insert(lines.map((l) => ({ user_id: user.id, week_start: week, name: l.name, quantity: l.quantity, unit: l.unit, grams: l.grams }))),
      'insert list',
    );
  }
  const items = dbCheck(await supabase.from('shopping_list_items').select('*').eq('user_id', user.id).eq('week_start', week).order('name'), 'load list');
  return ok({ week, items });
});
