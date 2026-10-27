import { dbCheck, ok, requireUser, route } from '@/lib/api';
import { cleanText } from '@/lib/validation';

/** Fuzzy search across the shared starter catalog and the user's own foods (RLS applies). */
export const GET = route(async (req) => {
  const { supabase } = await requireUser();
  const q = cleanText(80).parse(new URL(req.url).searchParams.get('q') ?? '');
  if (q.length < 1) return ok({ foods: [] });
  const foods = dbCheck(await supabase.rpc('search_foods', { q, max_results: 15 }), 'search foods') ?? [];
  return ok({ foods });
});
