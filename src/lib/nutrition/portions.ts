/**
 * Portion math. Source values are always per 100 g; calculated values are for a portion:
 *   nutrient for portion = nutrient per 100 g × portion grams / 100
 * Calculated values are rounded to 0.1; source values are stored untouched.
 */

export type Per100 = {
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number | null;
};

export type Nutrients = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export const ZERO: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function nutrientsForPortion(per100: Per100, grams: number): Nutrients {
  if (!Number.isFinite(grams) || grams < 0) throw new Error('invalid_grams');
  const f = grams / 100;
  return {
    kcal: round1(per100.kcal_100g * f),
    protein_g: round1(per100.protein_100g * f),
    carbs_g: round1(per100.carbs_100g * f),
    fat_g: round1(per100.fat_100g * f),
    fiber_g: round1((per100.fiber_100g ?? 0) * f),
  };
}

/** Converts an estimate for a whole portion back into per-100 g values. */
export function per100FromPortion(n: Partial<Nutrients> & { kcal: number }, grams: number): Per100 {
  if (!(grams > 0)) throw new Error('invalid_grams');
  const f = 100 / grams;
  return {
    kcal_100g: round1(n.kcal * f),
    protein_100g: round1((n.protein_g ?? 0) * f),
    carbs_100g: round1((n.carbs_g ?? 0) * f),
    fat_100g: round1((n.fat_g ?? 0) * f),
    fiber_100g: n.fiber_g == null ? null : round1(n.fiber_g * f),
  };
}

export type NutrientsLike = { [K in keyof Nutrients]?: number | string | null };

export function sumNutrients(list: Array<NutrientsLike | null | undefined>): Nutrients {
  const out = { ...ZERO };
  for (const n of list) {
    if (!n) continue;
    out.kcal += Number(n.kcal ?? 0);
    out.protein_g += Number(n.protein_g ?? 0);
    out.carbs_g += Number(n.carbs_g ?? 0);
    out.fat_g += Number(n.fat_g ?? 0);
    out.fiber_g += Number(n.fiber_g ?? 0);
  }
  return {
    kcal: round1(out.kcal),
    protein_g: round1(out.protein_g),
    carbs_g: round1(out.carbs_g),
    fat_g: round1(out.fat_g),
    fiber_g: round1(out.fiber_g),
  };
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  if (!Number.isFinite(factor) || factor < 0) throw new Error('invalid_factor');
  return {
    kcal: round1(n.kcal * factor),
    protein_g: round1(n.protein_g * factor),
    carbs_g: round1(n.carbs_g * factor),
    fat_g: round1(n.fat_g * factor),
    fiber_g: round1(n.fiber_g * factor),
  };
}

/** Nutrients for a number of servings of a recipe whose values are stored per serving. */
export function recipeServingNutrients(
  perServing: { kcal_per_serving: number; protein_per_serving: number; carbs_per_serving: number; fat_per_serving: number; fiber_per_serving: number },
  servings: number,
): Nutrients {
  return scaleNutrients(
    {
      kcal: Number(perServing.kcal_per_serving),
      protein_g: Number(perServing.protein_per_serving),
      carbs_g: Number(perServing.carbs_per_serving),
      fat_g: Number(perServing.fat_per_serving),
      fiber_g: Number(perServing.fiber_per_serving),
    },
    servings,
  );
}

// Unit conversions ----------------------------------------------------------

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => round1(kg * LB_PER_KG);
export const lbToKg = (lb: number) => round1(lb / LB_PER_KG);

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = cm / CM_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - ft * 12);
  if (inches === 12) {
    ft += 1;
    inches = 0;
  }
  return { ft, inches };
}

export const ftInToCm = (ft: number, inches: number) => round1((ft * 12 + inches) * CM_PER_IN);

export const OZ_PER_G = 1 / 28.349523125;
export const gToOz = (g: number) => round1(g * OZ_PER_G);
