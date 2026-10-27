import { z } from 'zod';
import { dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { deleteAllPhotos } from '@/lib/server/account';

/** Permanently deletes the account. Photos are removed first; every table cascades from auth.users. */
export const DELETE = route(async (req) => {
  const { supabase, user } = await requireUser();
  await readJson(req, z.object({ confirm: z.literal('DELETE') }));
  await deleteAllPhotos(supabase, user.id);
  dbCheck(await supabase.rpc('delete_my_account'), 'delete account');
  await supabase.auth.signOut();
  return ok({ deleted: true });
});
