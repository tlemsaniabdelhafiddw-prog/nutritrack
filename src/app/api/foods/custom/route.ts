import { dbOne, ok, readJson, requireUser, route } from '@/lib/api';
import { customFoodInput } from '@/lib/validation';

/** Creates a private food from label values entered by the user. */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  const input = await readJson(req, customFoodInput);
  const food = dbOne(
    await supabase
      .from('foods')
      .insert({
        name: input.name,
        ...input.per100,
        serving_unit: input.serving_grams ? 'serving' : null,
        serving_grams: input.serving_grams,
        source: 'user',
        source_note: 'Entered by the user.',
        created_by: user.id,
      })
      .select('*')
      .single(),
    'insert custom food',
  );
  return ok({ food }, { status: 201 });
});
