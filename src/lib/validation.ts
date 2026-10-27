import { z } from 'zod';
import { isLocalDate, isValidTimeZone } from './dates';

/** Request payload schemas shared by route handlers and forms. */

export const localDate = z.string().refine(isLocalDate, 'invalid_date');
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalid_time');
export const timeZone = z.string().min(1).max(64).refine(isValidTimeZone, 'invalid_timezone');
export const uuid = z.uuid();

export const mealCategory = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export const sex = z.enum(['male', 'female']);
export const activityLevel = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']);
export const goal = z.enum(['maintain', 'lose', 'gain']);
export const units = z.enum(['metric', 'imperial']);
export const locale = z.enum(['en', 'fr', 'ar']);

export const DIETARY_PREFERENCES = ['vegetarian', 'vegan', 'pescatarian', 'halal', 'gluten_free', 'dairy_free', 'low_sodium'] as const;
export const ALLERGENS = ['gluten', 'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'soy', 'sesame', 'celery'] as const;

/** Strips control characters and trims; keeps the text otherwise as typed. */
export const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim())
    .pipe(z.string().max(max));

const nutrient = (max: number) => z.number().finite().min(0).max(max);

export const per100Schema = z.object({
  kcal_100g: nutrient(950),
  protein_100g: nutrient(100),
  carbs_100g: nutrient(100),
  fat_100g: nutrient(100),
  fiber_100g: nutrient(100).nullable(),
});

export const mealItemInput = z.object({
  name: cleanText(200).pipe(z.string().min(1)),
  grams: z.number().finite().gt(0).max(5000),
  food_id: uuid.nullable(),
  nutrient_source: z.enum(['database', 'ai_estimate', 'manual']),
  per100: per100Schema,
});

export const mealCreateInput = z.object({
  client_request_id: uuid,
  name: cleanText(120).pipe(z.string().min(1)),
  category: mealCategory,
  date: localDate,
  time: timeOfDay,
  source: z.enum(['manual', 'scan']),
  items: z.array(mealItemInput).min(1).max(40),
  notes: cleanText(1000).nullable().optional(),
  photo_path: z.string().max(300).nullable().optional(),
  analysis: z.unknown().optional(),
});

export const mealUpdateInput = mealCreateInput.omit({ client_request_id: true, source: true, analysis: true, photo_path: true });

export const recipeLogInput = z.object({
  client_request_id: uuid,
  servings: z.number().finite().gt(0).max(24),
  category: mealCategory,
  date: localDate,
  time: timeOfDay,
});

export const weightInput = z.object({
  measured_on: localDate,
  weight_kg: z.number().finite().min(20).max(400),
  note: cleanText(200).nullable().optional(),
});

export const waterInput = z.object({
  date: localDate,
  amount_ml: z.number().int().min(1).max(3000),
});

export const bodyInputSchema = z.object({
  age_years: z.number().int().min(2).max(110),
  sex,
  height_cm: z.number().finite().min(120).max(230),
  weight_kg: z.number().finite().min(30).max(300),
  activity: activityLevel,
  goal,
});

export const targetsInput = z.object({
  calories: z.number().int().min(800).max(6000),
  protein_g: z.number().finite().min(0).max(500),
  carbs_g: z.number().finite().min(0).max(1000),
  fat_g: z.number().finite().min(0).max(400),
  fiber_g: z.number().finite().min(0).max(150).nullable(),
  is_custom: z.boolean(),
});

export const profileInput = z.object({
  display_name: cleanText(60).pipe(z.string().min(1)),
  date_of_birth: localDate,
  sex,
  height_cm: z.number().finite().min(120).max(230),
  weight_kg: z.number().finite().min(30).max(300),
  target_weight_kg: z.number().finite().min(30).max(300).nullable(),
  activity_level: activityLevel,
  goal,
  units,
  locale,
  timezone: timeZone,
});

export const preferencesInput = z.object({
  dietary_preferences: z.array(z.enum(DIETARY_PREFERENCES)).max(DIETARY_PREFERENCES.length),
  allergies: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length),
  restrictions_note: cleanText(500).nullable(),
  water_goal_ml: z.number().int().min(250).max(8000),
  keep_meal_photos: z.boolean(),
});

export const onboardingInput = z.object({
  profile: profileInput,
  preferences: preferencesInput,
  targets: targetsInput.nullable(),
});

export const customFoodInput = z.object({
  name: cleanText(200).pipe(z.string().min(1)),
  serving_grams: z.number().finite().gt(0).max(5000).nullable(),
  per100: per100Schema,
});

export const plannedMealInput = z.object({
  plan_date: localDate,
  category: mealCategory,
  recipe_id: uuid,
  servings: z.number().finite().gt(0).max(24),
});

export const plannedMealUpdate = z
  .object({ plan_date: localDate, category: mealCategory, servings: z.number().finite().gt(0).max(24) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'empty_update');

export type MealCreateInput = z.infer<typeof mealCreateInput>;
export type MealItemInput = z.infer<typeof mealItemInput>;
