import { ApiError, dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { uuid, weightInput } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const input = await readJson(req, weightInput);
  const res = await supabase
    .from('weight_entries')
    .update({ measured_on: input.measured_on, weight_kg: input.weight_kg, note: input.note ?? null })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (res.error?.code === '23505') throw new ApiError(409, 'conflict', [{ path: 'measured_on', message: 'date_taken' }]);
  const entry = dbCheck(res, 'update weight');
  if (!entry) throw new ApiError(404, 'not_found');
  return ok({ entry });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const res = dbCheck(await supabase.from('weight_entries').delete().eq('id', id).eq('user_id', user.id).select('id'), 'delete weight');
  if (!res?.length) throw new ApiError(404, 'not_found');
  return ok({ deleted: true });
});
