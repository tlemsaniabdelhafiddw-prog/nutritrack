import { z } from 'zod';
import { ApiError, dbOne, ok, readJson, requireUser, route } from '@/lib/api';
import { isUsdaConfigured, serverEnv } from '@/lib/env';
import { getUsdaFood, UsdaError } from '@/lib/food-sources/usda';

const input = z.object({ fdcId: z.number().int().positive() });

/**
 * Saves a USDA food into the user's private catalog. Values are re-fetched from USDA by fdcId,
 * so the stored record reflects the source rather than anything the client sent.
 */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  if (!isUsdaConfigured()) throw new ApiError(503, 'external_service_unavailable');
  const { fdcId } = await readJson(req, input);

  const existing = await supabase.from('foods').select('*').eq('created_by', user.id).eq('source', 'usda').eq('source_id', String(fdcId)).maybeSingle();
  if (existing.data) return ok({ food: existing.data });

  let food;
  try {
    food = await getUsdaFood(fdcId, serverEnv.fdcApiKey);
  } catch (err) {
    if (err instanceof UsdaError && err.code === 'not_found') throw new ApiError(404, 'not_found');
    if (err instanceof UsdaError && err.code === 'rate_limited') throw new ApiError(429, 'rate_limited');
    throw new ApiError(502, 'external_service_unavailable');
  }

  const inserted = dbOne(
    await supabase
      .from('foods')
      .insert({
        name: food.name.slice(0, 200),
        ...food.per100,
        source: 'usda',
        source_id: String(food.fdcId),
        source_note: `USDA FoodData Central, ${food.dataType}, FDC ID ${food.fdcId} (public domain, CC0).`,
        created_by: user.id,
      })
      .select('*')
      .single(),
    'insert usda food',
  );
  return ok({ food: inserted }, { status: 201 });
});
