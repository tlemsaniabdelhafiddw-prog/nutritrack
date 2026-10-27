import { ApiError, dbCheck, ok, requireUser, route } from '@/lib/api';
import { uuid } from '@/lib/validation';
import { removePhotos } from '@/lib/server/meals';

type Ctx = { params: Promise<{ id: string }> };

/** Deletes the stored photo for a meal and keeps the meal itself. */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const meal = dbCheck(await supabase.from('meals').select('id, photo_path').eq('id', id).eq('user_id', user.id).maybeSingle(), 'load meal');
  if (!meal) throw new ApiError(404, 'not_found');
  if (meal.photo_path) {
    await removePhotos(supabase, [meal.photo_path]);
    dbCheck(await supabase.from('meals').update({ photo_path: null }).eq('id', id).eq('user_id', user.id), 'clear photo');
  }
  return ok({ deleted: true });
});
