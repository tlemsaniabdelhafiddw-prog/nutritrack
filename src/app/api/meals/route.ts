import { ok, readJson, requireUser, route } from '@/lib/api';
import { mealCreateInput } from '@/lib/validation';
import { buildItems, getUserTimeZone, insertMeal, resolveEatenAt } from '@/lib/server/meals';
import { sumNutrients } from '@/lib/nutrition/portions';

/** Create a meal (manual entry or reviewed photo analysis). */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const input = await readJson(req, mealCreateInput);
  const tz = await getUserTimeZone(supabase, user.id);
  const items = await buildItems(supabase, input.items);
  const when = resolveEatenAt(input.date, input.time, tz);

  const result = await insertMeal(supabase, {
    userId: user.id,
    clientRequestId: input.client_request_id,
    name: input.name,
    category: input.category,
    eatenAt: when.eaten_at,
    localDate: when.local_date,
    source: input.source,
    items,
    photoPath: input.photo_path ?? null,
    analysis: input.source === 'scan' ? input.analysis ?? null : null,
    notes: input.notes ?? null,
  });

  return ok(
    { id: result.id, duplicate: result.duplicate, local_date: when.local_date, totals: sumNutrients(items) },
    { status: result.duplicate ? 200 : 201 },
  );
});
