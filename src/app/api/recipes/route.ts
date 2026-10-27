import { ok, route } from '@/lib/api';
import { getCurrentUser } from '@/lib/supabase/server';
import { listRecipes } from '@/lib/server/recipes';
import { ALLERGENS, cleanText } from '@/lib/validation';

/** Public recipe search with filters; favorites are included for signed-in users. */
export const GET = route(async (req) => {
  const { supabase, user } = await getCurrentUser();
  const sp = new URL(req.url).searchParams;
  const n = (k: string) => (sp.get(k) ? Number(sp.get(k)) || undefined : undefined);
  const exclude = (sp.get('exclude') ?? '').split(',').filter((a): a is (typeof ALLERGENS)[number] => (ALLERGENS as readonly string[]).includes(a));
  const { recipes, favorites } = await listRecipes(
    supabase,
    {
      q: cleanText(80).parse(sp.get('q') ?? ''),
      meal: sp.get('meal') ?? undefined,
      diet: sp.get('diet') ?? undefined,
      maxMinutes: n('time'),
      maxKcal: n('kcal'),
      minProtein: n('protein'),
      exclude,
      favoritesOnly: sp.get('fav') === '1',
    },
    user?.id ?? null,
  );
  return ok({ recipes: recipes.map((r) => ({ ...r, favorite: favorites.has(r.id) })) });
});
