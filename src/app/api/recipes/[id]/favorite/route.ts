import { ApiError, dbCheck, ok, requireUser, route } from '@/lib/api';
import { uuid } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

async function recipeId(params: Ctx['params']) {
  return uuid.parse((await params).id);
}

export const POST = route<Ctx>(async (_req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = await recipeId(params);
  const exists = await supabase.from('recipes').select('id').eq('id', id).maybeSingle();
  if (!exists.data) throw new ApiError(404, 'not_found');
  dbCheck(await supabase.from('favorite_recipes').upsert({ user_id: user.id, recipe_id: id }, { onConflict: 'user_id,recipe_id', ignoreDuplicates: true }), 'favorite');
  return ok({ favorite: true });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = await recipeId(params);
  dbCheck(await supabase.from('favorite_recipes').delete().eq('user_id', user.id).eq('recipe_id', id), 'unfavorite');
  return ok({ favorite: false });
});
