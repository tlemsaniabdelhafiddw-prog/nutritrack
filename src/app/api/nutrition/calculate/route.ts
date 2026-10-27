import { ok, readJson, route } from '@/lib/api';
import { bodyInputSchema } from '@/lib/validation';
import { buildNutritionPlan } from '@/lib/nutrition/calc';

/** Stateless calculator: BMI, BMR (Mifflin–St Jeor), TDEE and suggested targets. */
export const POST = route(async (req) => {
  const i = await readJson(req, bodyInputSchema);
  return ok(
    buildNutritionPlan({ ageYears: i.age_years, sex: i.sex, heightCm: i.height_cm, weightKg: i.weight_kg, activity: i.activity, goal: i.goal }),
  );
});
