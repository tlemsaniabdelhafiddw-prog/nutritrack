import 'server-only';
import type { ServerSupabase } from '../supabase/server';
import { dbCheck } from '../api';
import { removePhotos } from './meals';

/** Lists every object in the user's private photo folder. */
export async function listUserPhotos(supabase: ServerSupabase, userId: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from('meal-photos').list(userId, { limit: 100, offset });
    if (error || !data?.length) break;
    out.push(...data.filter((o) => o.id).map((o) => `${userId}/${o.name}`));
    if (data.length < 100) break;
  }
  return out;
}

export async function deleteAllPhotos(supabase: ServerSupabase, userId: string) {
  await removePhotos(supabase, await listUserPhotos(supabase, userId));
  dbCheck(await supabase.from('meals').update({ photo_path: null }).eq('user_id', userId).not('photo_path', 'is', null), 'clear photo paths');
}

/** Deletes all personal nutrition data but keeps the account and profile settings. */
export async function deleteNutritionData(supabase: ServerSupabase, userId: string) {
  await deleteAllPhotos(supabase, userId);
  for (const table of ['planned_meals', 'shopping_list_items', 'meals', 'weight_entries', 'water_entries', 'favorite_recipes', 'nutrition_targets', 'ai_requests'] as const) {
    dbCheck(await supabase.from(table).delete().eq('user_id', userId), `delete ${table}`);
  }
  dbCheck(await supabase.from('foods').delete().eq('created_by', userId), 'delete own foods');
}
