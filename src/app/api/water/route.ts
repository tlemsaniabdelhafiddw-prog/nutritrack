import { dbOne, ok, readJson, requireUser, route } from '@/lib/api';
import { waterInput } from '@/lib/validation';

export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const input = await readJson(req, waterInput);
  const entry = dbOne(
    await supabase.from('water_entries').insert({ user_id: user.id, local_date: input.date, amount_ml: input.amount_ml }).select('*').single(),
    'log water',
  );
  return ok({ entry }, { status: 201 });
});
