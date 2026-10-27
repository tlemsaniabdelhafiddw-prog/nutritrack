import 'server-only';
import type { ServerSupabase } from '../supabase/server';
import type { Tables } from '../supabase/database.types';
import { dbCheck } from '../api';

export type Recipe = Tables<'recipes'>;
export type RecipeDetail = Recipe & {
  ingredients: Tables<'recipe_ingredients'>[];
  instructions: Tables<'recipe_instructions'>[];
};

export { localized } from '../localized';

export type RecipeFilters = {
  q?: string;
  meal?: string;
  maxMinutes?: number;
  maxKcal?: number;
  minProtein?: number;
  diet?: string;
  exclude?: string[];
  favoritesOnly?: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listRecipes(supabase: ServerSupabase, f: RecipeFilters, userId: string | null) {
  let query = supabase.from('recipes').select('*').order('title');
  if (f.meal) query = query.contains('meal_types', [f.meal]);
  if (f.diet) query = query.contains('diet_tags', [f.diet]);
  if (f.maxKcal) query = query.lte('kcal_per_serving', f.maxKcal);
  if (f.minProtein) query = query.gte('protein_per_serving', f.minProtein);
  if (f.exclude?.length) query = query.not('allergens', 'ov', `{${f.exclude.join(',')}}`);
  let recipes = dbCheck(await query, 'list recipes') ?? [];

  if (f.maxMinutes) recipes = recipes.filter((r) => r.prep_minutes + r.cook_minutes <= f.maxMinutes!);

  if (f.q && f.q.trim()) {
    const term = f.q.trim().toLowerCase();
    // Ingredient search covers names in every language.
    const ingr = dbCheck(
      await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .or(`name.ilike.%${escapeLike(term)}%,name_fr.ilike.%${escapeLike(term)}%,name_ar.ilike.%${escapeLike(term)}%`),
      'search ingredients',
    );
    const ingredientHits = new Set((ingr ?? []).map((i) => i.recipe_id));
    recipes = recipes.filter(
      (r) =>
        ingredientHits.has(r.id) ||
        [r.title, r.title_fr, r.title_ar, r.description, r.description_fr].some((v) => v?.toLowerCase().includes(term)),
    );
  }

  let favorites = new Set<string>();
  if (userId) {
    const fav = await supabase.from('favorite_recipes').select('recipe_id').eq('user_id', userId);
    favorites = new Set((fav.data ?? []).map((r) => r.recipe_id));
  }
  if (f.favoritesOnly) recipes = recipes.filter((r) => favorites.has(r.id));
  return { recipes, favorites };
}

function escapeLike(s: string) {
  return s.replace(/[%_,().*\\]/g, ' ').trim();
}

export async function getRecipe(supabase: ServerSupabase, idOrSlug: string): Promise<RecipeDetail | null> {
  const col = UUID_RE.test(idOrSlug) ? 'id' : 'slug';
  const res = await supabase
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(*), instructions:recipe_instructions(*)')
    .eq(col, idOrSlug)
    .maybeSingle();
  if (res.error || !res.data) return null;
  const r = res.data;
  return {
    ...r,
    ingredients: [...(r.ingredients ?? [])].sort((a, b) => a.position - b.position),
    instructions: [...(r.instructions ?? [])].sort((a, b) => a.step - b.step),
  };
}
