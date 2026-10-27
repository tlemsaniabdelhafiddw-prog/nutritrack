import { ApiError, ok, requireUser, route } from '@/lib/api';
import { isUsdaConfigured, serverEnv } from '@/lib/env';
import { cleanText } from '@/lib/validation';
import { searchUsda, UsdaError } from '@/lib/food-sources/usda';

/** Proxies USDA FoodData Central search so the API key stays on the server. */
export const GET = route(async (req) => {
  await requireUser();
  if (!isUsdaConfigured()) return ok({ configured: false, foods: [] });
  const q = cleanText(80).parse(new URL(req.url).searchParams.get('q') ?? '');
  if (q.length < 2) return ok({ configured: true, foods: [] });
  try {
    return ok({ configured: true, foods: await searchUsda(q, serverEnv.fdcApiKey) });
  } catch (err) {
    if (err instanceof UsdaError && err.code === 'rate_limited') throw new ApiError(429, 'rate_limited');
    throw new ApiError(502, 'external_service_unavailable');
  }
});
