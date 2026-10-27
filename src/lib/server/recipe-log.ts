import 'server-only';
import type { ServerSupabase } from '../supabase/server';
import { ApiError } from '../api';
import { getRecipe } from './recipes';
import { getUserTimeZone, insertMeal, resolveEatenAt, type ServerItem } from './meals';
import { nutrientsForPortion } from '../nutrition/portions';
import { localized } from './recipes';
import type { Locale } from '@/i18n/config';

/**
 * Logs servings of a recipe as a meal. Each ingredient becomes an item scaled by
 * servings eaten ÷ recipe servings, using the catalog values for that ingredient, so the
 * diary total matches the recipe's per-serving estimate × servings.
 */
export async function logRecipe(
  supabase: ServerSupabase,
  userId: string,
  args: { recipeId: string; servings: number; category: string; date: string; time: string; clientRequestId: string; locale: Locale },
) {
  const recipe = await getRecipe(supabase, args.recipeId);
  if (!recipe) throw new ApiError(404, 'not_found');

  const foodIds = recipe.ingredients.map((i) => i.food_id).filter((x): x is string => Boolean(x));
  const { data: foods } = await supabase.from('foods').select('id, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g').in('id', foodIds);
  const byId = new Map((foods ?? []).map((f) => [f.id, f]));

  const scale = args.servings / recipe.servings;
  const items: ServerItem[] = [];
  for (const ing of recipe.ingredients) {
    const f = ing.food_id ? byId.get(ing.food_id) : undefined;
    const grams = Math.round(Number(ing.grams) * scale * 10) / 10;
    if (!f || grams <= 0) continue;
    const per100 = {
      kcal_100g: Number(f.kcal_100g),
      protein_100g: Number(f.protein_100g),
      carbs_100g: Number(f.carbs_100g),
      fat_100g: Number(f.fat_100g),
      fiber_100g: f.fiber_100g === null ? null : Number(f.fiber_100g),
    };
    const n = nutrientsForPortion(per100, grams);
    items.push({
      position: items.length,
      food_id: ing.food_id,
      name: localized(ing, 'name', args.locale),
      grams,
      ...per100,
      kcal: n.kcal,
      protein_g: n.protein_g,
      carbs_g: n.carbs_g,
      fat_g: n.fat_g,
      fiber_g: per100.fiber_100g === null ? null : n.fiber_g,
      nutrient_source: 'recipe',
    });
  }
  if (!items.length) throw new ApiError(422, 'invalid_input', [{ path: 'recipe', message: 'no_ingredients_with_nutrition' }]);

  const tz = await getUserTimeZone(supabase, userId);
  const when = resolveEatenAt(args.date, args.time, tz);
  const result = await insertMeal(supabase, {
    userId,
    clientRequestId: args.clientRequestId,
    name: localized(recipe, 'title', args.locale).slice(0, 120),
    category: args.category,
    eatenAt: when.eaten_at,
    localDate: when.local_date,
    source: 'recipe',
    recipeId: recipe.id,
    recipeServings: args.servings,
    items,
  });
  return { ...result, local_date: when.local_date };
}
