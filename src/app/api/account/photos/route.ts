import { ok, requireUser, route } from '@/lib/api';
import { deleteAllPhotos } from '@/lib/server/account';

/** Deletes every stored meal photo; meals remain in the diary. */
export const DELETE = route(async () => {
  const { supabase, user } = await requireUser();
  await deleteAllPhotos(supabase, user.id);
  return ok({ deleted: true });
});
