import { dbOne, ok, readJson, requireUser, route } from '@/lib/api';
import { localDate, weightInput } from '@/lib/validation';
import { getWeights } from '@/lib/server/diary';

export const GET = route(async (req) => {
  const { supabase, user } = await requireUser();
  const from = new URL(req.url).searchParams.get('from');
  return ok({ entries: await getWeights(supabase, user.id, from ? localDate.parse(from) : undefined) });
});

/** One weigh-in per day: saving again for the same date replaces it. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const input = await readJson(req, weightInput);
  const entry = dbOne(
    await supabase
      .from('weight_entries')
      .upsert({ user_id: user.id, measured_on: input.measured_on, weight_kg: input.weight_kg, note: input.note ?? null }, { onConflict: 'user_id,measured_on' })
      .select('*')
      .single(),
    'save weight',
  );
  // Keep the profile's current weight in step with the latest weigh-in.
  const latest = await supabase.from('weight_entries').select('weight_kg').eq('user_id', user.id).order('measured_on', { ascending: false }).limit(1).maybeSingle();
  if (latest.data) await supabase.from('profiles').update({ weight_kg: latest.data.weight_kg }).eq('id', user.id);
  return ok({ entry }, { status: 201 });
});
