import 'server-only';
import { ApiError, dbCheck, dbOne } from '../api';
import type { ServerSupabase } from '../supabase/server';
import type { TablesInsert, Json } from '../supabase/database.types';
import { nutrientsForPortion, type Per100 } from '../nutrition/portions';
import { localDateFor, safeTimeZone, zonedTimeToUtc } from '../dates';
import type { MealItemInput } from '../validation';

export type ServerItem = Omit<TablesInsert<'meal_items'>, 'meal_id' | 'user_id'>;

/**
 * Turns client items into rows. Totals are always recomputed here from per-100 g values;
 * for catalog foods the per-100 g values are re-read from the database so a client cannot
 * substitute its own numbers for verified ones.
 */
export async function buildItems(supabase: ServerSupabase, items: MealItemInput[]): Promise<ServerItem[]> {
  const foodIds = [...new Set(items.filter((i) => i.food_id && i.nutrient_source === 'database').map((i) => i.food_id!))];
  const foods = new Map<string, Per100>();
  if (foodIds.length) {
    const rows = dbCheck(
      await supabase.from('foods').select('id, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g').in('id', foodIds),
      'load foods',
    );
    for (const r of rows ?? []) foods.set(r.id, r);
  }

  return items.map((item, position) => {
    let per100: Per100 = item.per100;
    let source = item.nutrient_source;
    let foodId = item.food_id;
    if (source === 'database') {
      const f = foodId ? foods.get(foodId) : undefined;
      if (!f) throw new ApiError(400, 'invalid_input', [{ path: `items.${position}.food_id`, message: 'food_not_found' }]);
      per100 = {
        kcal_100g: Number(f.kcal_100g),
        protein_100g: Number(f.protein_100g),
        carbs_100g: Number(f.carbs_100g),
        fat_100g: Number(f.fat_100g),
        fiber_100g: f.fiber_100g === null ? null : Number(f.fiber_100g),
      };
    } else if (foodId && !foods.has(foodId)) {
      // An AI or manual item may reference a food only for display; keep the link only if it exists for this user.
      foodId = null;
    }
    if (source !== 'database' && source !== 'ai_estimate') source = 'manual';
    const n = nutrientsForPortion(per100, item.grams);
    return {
      position,
      food_id: foodId,
      name: item.name,
      grams: item.grams,
      ...per100,
      kcal: n.kcal,
      protein_g: n.protein_g,
      carbs_g: n.carbs_g,
      fat_g: n.fat_g,
      fiber_g: per100.fiber_100g === null ? null : n.fiber_g,
      nutrient_source: source,
    };
  });
}

export async function getUserTimeZone(supabase: ServerSupabase, userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('timezone').eq('id', userId).maybeSingle();
  return safeTimeZone(data?.timezone);
}

/** Wall-clock date/time in the user's timezone → UTC instant + the local date it belongs to. */
export function resolveEatenAt(date: string, time: string, timeZone: string) {
  const instant = zonedTimeToUtc(date, time, timeZone);
  return { eaten_at: instant.toISOString(), local_date: localDateFor(instant, timeZone) };
}

type CreateMealArgs = {
  userId: string;
  clientRequestId: string;
  name: string;
  category: string;
  eatenAt: string;
  localDate: string;
  source: 'manual' | 'scan' | 'recipe';
  items: ServerItem[];
  recipeId?: string | null;
  recipeServings?: number | null;
  photoPath?: string | null;
  analysis?: unknown;
  notes?: string | null;
};

/**
 * Inserts a meal and its items. Idempotent on client_request_id: a repeated submission
 * returns the meal created by the first one instead of a duplicate.
 */
export async function insertMeal(supabase: ServerSupabase, a: CreateMealArgs): Promise<{ id: string; duplicate: boolean }> {
  if (a.photoPath && !a.photoPath.startsWith(`${a.userId}/`)) throw new ApiError(403, 'forbidden');

  const existing = await supabase
    .from('meals')
    .select('id')
    .eq('user_id', a.userId)
    .eq('client_request_id', a.clientRequestId)
    .maybeSingle();
  if (existing.data) return { id: existing.data.id, duplicate: true };

  const inserted = await supabase
    .from('meals')
    .insert({
      user_id: a.userId,
      client_request_id: a.clientRequestId,
      name: a.name,
      category: a.category,
      eaten_at: a.eatenAt,
      local_date: a.localDate,
      source: a.source,
      recipe_id: a.recipeId ?? null,
      recipe_servings: a.recipeServings ?? null,
      photo_path: a.photoPath ?? null,
      analysis: (a.analysis ?? null) as Json,
      notes: a.notes ?? null,
    })
    .select('id')
    .single();

  if (inserted.error?.code === '23505') {
    const again = await supabase.from('meals').select('id').eq('user_id', a.userId).eq('client_request_id', a.clientRequestId).single();
    if (again.data) return { id: again.data.id, duplicate: true };
  }
  const meal = dbOne(inserted, 'insert meal');

  const itemsRes = await supabase.from('meal_items').insert(a.items.map((i) => ({ ...i, meal_id: meal.id, user_id: a.userId })));
  if (itemsRes.error) {
    await supabase.from('meals').delete().eq('id', meal.id);
    dbCheck(itemsRes, 'insert meal items');
  }
  return { id: meal.id, duplicate: false };
}

export async function removePhotos(supabase: ServerSupabase, paths: string[]) {
  const clean = paths.filter(Boolean);
  if (!clean.length) return;
  for (let i = 0; i < clean.length; i += 100) {
    const { error } = await supabase.storage.from('meal-photos').remove(clean.slice(i, i + 100));
    if (error) console.error('[storage] remove failed', error.message);
  }
}

/** Short-lived signed URLs for the user's own private photos. */
export async function signPhotoUrls(supabase: ServerSupabase, paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from('meal-photos').createSignedUrls(unique, 60 * 30);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
