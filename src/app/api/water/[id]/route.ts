import { ApiError, dbCheck, ok, requireUser, route } from '@/lib/api';
import { uuid } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const res = dbCheck(await supabase.from('water_entries').delete().eq('id', id).eq('user_id', user.id).select('id'), 'delete water');
  if (!res?.length) throw new ApiError(404, 'not_found');
  return ok({ deleted: true });
});
