import { z } from 'zod';
import { ApiError, dbCheck, ok, readJson, requireUser, route } from '@/lib/api';
import { uuid } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { supabase, user } = await requireUser();
  const id = uuid.parse((await params).id);
  const { checked } = await readJson(req, z.object({ checked: z.boolean() }));
  const row = dbCheck(await supabase.from('shopping_list_items').update({ checked }).eq('id', id).eq('user_id', user.id).select('*').maybeSingle(), 'check item');
  if (!row) throw new ApiError(404, 'not_found');
  return ok({ item: row });
});
