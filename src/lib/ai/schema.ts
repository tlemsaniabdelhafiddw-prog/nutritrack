import { z } from 'zod';

/**
 * Structured output the vision model must return. Anything that does not match is rejected;
 * the app never fills in a "best guess" of its own when the model output is malformed.
 */

export const confidenceLevel = z.enum(['low', 'medium', 'high']);
export type ConfidenceLevel = z.infer<typeof confidenceLevel>;

const nonNeg = (max: number) => z.number().finite().min(0).max(max);

export const analysisItemSchema = z.object({
  name: z.string().trim().min(1).max(120).describe('Name of the food as the user would say it, in the requested language.'),
  search_term: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .describe('Short generic English food name for database lookup, e.g. "rice, white, cooked" or "olive oil".'),
  estimated_grams: z.number().finite().min(1).max(3000).describe('Estimated edible weight in grams.'),
  identification_confidence: confidenceLevel,
  portion_confidence: confidenceLevel,
  kcal: nonNeg(5000).describe('Model estimate of energy for this portion, kcal.'),
  protein_g: nonNeg(500),
  carbs_g: nonNeg(800),
  fat_g: nonNeg(500),
  fiber_g: nonNeg(200).nullable(),
  notes: z.string().trim().max(240).nullable().describe('Uncertainty about identity, portion or preparation.'),
});

export const mealAnalysisSchema = z.object({
  is_food: z.boolean().describe('False if the image does not show food or drink.'),
  meal_description: z.string().trim().max(200),
  items: z.array(analysisItemSchema).max(20),
  hidden_ingredients: z
    .array(z.string().trim().min(1).max(120))
    .max(10)
    .describe('Ingredients likely present but not visible, e.g. cooking oil, butter, sugar, sauces.'),
  clarifying_questions: z
    .array(z.string().trim().min(1).max(200))
    .max(5)
    .describe('Questions whose answers would materially change the estimate.'),
  overall_confidence: confidenceLevel,
  uncertainty_notice: z.string().trim().min(1).max(400),
});

export type AnalysisItem = z.infer<typeof analysisItemSchema>;
export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;

/** JSON schema for the provider's tool/structured-output definition. */
export function mealAnalysisJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(mealAnalysisSchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export type ParsedAnalysis =
  | { ok: true; analysis: MealAnalysis; warnings: AnalysisWarning[] }
  | { ok: false; error: 'invalid_output'; issues: string[] };

export type AnalysisWarning = { itemIndex: number; code: 'energy_macro_mismatch' };

/**
 * Validates raw model output. Also checks that each item's energy roughly agrees with its
 * macronutrients (4/4/9 kcal per gram); disagreements are surfaced as warnings in the review UI.
 */
export function parseMealAnalysis(raw: unknown): ParsedAnalysis {
  const result = mealAnalysisSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'invalid_output',
      issues: result.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  const warnings: AnalysisWarning[] = [];
  result.data.items.forEach((item, itemIndex) => {
    const fromMacros = item.protein_g * 4 + item.carbs_g * 4 + item.fat_g * 9;
    const tolerance = Math.max(25, item.kcal * 0.3);
    if (Math.abs(fromMacros - item.kcal) > tolerance) warnings.push({ itemIndex, code: 'energy_macro_mismatch' });
  });
  return { ok: true, analysis: result.data, warnings };
}
