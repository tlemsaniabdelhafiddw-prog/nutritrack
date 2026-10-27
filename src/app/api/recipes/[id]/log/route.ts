import { ok, readJson, requireUser, route } from '@/lib/api';
import { recipeLogInput } from '@/lib/validation';
import { logRecipe } from '@/lib/server/recipe-log';
import { getLocale } from '@/i18n/server';

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const { supabase, user } = await requireUser();
  const input = await readJson(req, recipeLogInput);
  const result = await logRecipe(supabase, user.id, {
    recipeId: (await params).id,
    servings: input.servings,
    category: input.category,
    date: input.date,
    time: input.time,
    clientRequestId: input.client_request_id,
    locale: await getLocale(),
  });
  return ok(result, { status: result.duplicate ? 200 : 201 });
});
