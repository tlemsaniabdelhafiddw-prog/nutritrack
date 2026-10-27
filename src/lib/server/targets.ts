import 'server-only';
import type { ServerSupabase } from '../supabase/server';
import type { Tables, Json } from '../supabase/database.types';
import { ApiError, dbOne } from '../api';
import { ageFromDateOfBirth, buildNutritionPlan, caloriesFromMacros, FORMULA_VERSION, type ActivityLevel, type Goal, type Sex } from '../nutrition/calc';

type TargetsIn = { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null; is_custom: boolean };

/**
 * Stores a new targets row (history is kept). The plan computed from the profile is saved
 * with its formula version and inputs so old targets stay interpretable. Minors get no
 * calorie target. Custom macros must be within 5% of the calorie target.
 */
export async function saveTargets(supabase: ServerSupabase, userId: string, profile: Tables<'profiles'>, input: TargetsIn | null) {
  const age = profile.date_of_birth ? ageFromDateOfBirth(profile.date_of_birth) : NaN;
  if (!profile.sex || !profile.height_cm || !profile.weight_kg || !profile.activity_level || !profile.goal || !Number.isFinite(age)) {
    throw new ApiError(409, 'onboarding_required');
  }
  const plan = buildNutritionPlan({
    ageYears: age,
    sex: profile.sex as Sex,
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    activity: profile.activity_level as ActivityLevel,
    goal: profile.goal as Goal,
  });

  if (plan.status === 'minor') return null;
  if (plan.status === 'invalid') throw new ApiError(400, 'invalid_input', plan.issues.map((i) => ({ path: 'profile', message: i })));

  const chosen = input ?? { ...plan.targets, is_custom: false };
  const implied = caloriesFromMacros(chosen);
  if (Math.abs(implied - chosen.calories) / chosen.calories > 0.05) {
    throw new ApiError(400, 'invalid_input', [{ path: 'targets', message: 'macros_do_not_match_calories' }]);
  }

  const row = dbOne(
    await supabase
      .from('nutrition_targets')
      .insert({
        user_id: userId,
        calories: chosen.calories,
        protein_g: chosen.protein_g,
        carbs_g: chosen.carbs_g,
        fat_g: chosen.fat_g,
        fiber_g: chosen.fiber_g,
        is_custom: chosen.is_custom,
        bmi: plan.bmi,
        bmr: plan.bmr,
        tdee: plan.tdee,
        formula_version: FORMULA_VERSION,
        inputs: { ...plan.inputs, suggested: plan.targets, notes: plan.notes } as unknown as Json,
      })
      .select('*')
      .single(),
    'insert targets',
  );
  return row;
}
