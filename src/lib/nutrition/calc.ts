/**
 * Body and energy calculations.
 *
 * BMI      = weight (kg) / height (m)^2 — a screening measure, not a body-fat measure.
 * BMR      = Mifflin–St Jeor (1990), validated for adults:
 *              male:   10 × kg + 6.25 × cm − 5 × age + 5
 *              female: 10 × kg + 6.25 × cm − 5 × age − 161
 *            It estimates resting energy expenditure; it does not measure it.
 * TDEE     = BMR × activity factor (approximate multipliers below).
 * Targets  = conservative adjustment of TDEE by goal, with a floor that never goes
 *            below estimated BMR or common minimum intakes.
 * Macros   = protein by body weight, fat as a share of energy, carbohydrate as the
 *            remainder, so 4·P + 4·C + 9·F matches the calorie target.
 */

export const FORMULA_VERSION = 'msj1990-act5-v1';

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'maintain' | 'lose' | 'gain';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // little or no exercise
  light: 1.375, // light exercise 1–3 days/week
  moderate: 1.55, // moderate exercise 3–5 days/week
  active: 1.725, // hard exercise 6–7 days/week
  very_active: 1.9, // physical job or twice-daily training
};

export const LIMITS = {
  ageMin: 2,
  ageMax: 110,
  adultAge: 18,
  heightCmMin: 120,
  heightCmMax: 230,
  weightKgMin: 30,
  weightKgMax: 300,
} as const;

/** Maximum daily deficit/surplus and their share of TDEE. */
const LOSE_SHARE = 0.15;
const LOSE_CAP = 500;
const GAIN_SHARE = 0.1;
const GAIN_CAP = 300;
const MIN_INTAKE: Record<Sex, number> = { female: 1200, male: 1500 };

const PROTEIN_G_PER_KG: Record<Goal, number> = { maintain: 1.2, lose: 1.6, gain: 1.4 };
const FAT_SHARE = 0.3;
const PROTEIN_MAX_SHARE = 0.35;
const FIBER_G_PER_1000_KCAL = 14;

export type BodyInputs = {
  ageYears: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
};

export type InputIssue =
  | 'age_out_of_range'
  | 'height_out_of_range'
  | 'weight_out_of_range'
  | 'bmi_implausible';

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function ageFromDateOfBirth(dob: string, today: Date = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round(weightKg / (m * m), 1);
}

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obesity';

/** Adult (18+) WHO categories. Returns null for minors, where BMI-for-age charts apply instead. */
export function bmiCategory(value: number, ageYears: number): BmiCategory | null {
  if (ageYears < LIMITS.adultAge) return null;
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy';
  if (value < 30) return 'overweight';
  return 'obesity';
}

export function bmrMifflinStJeor(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return round(sex === 'male' ? base + 5 : base - 161);
}

export function tdee(bmr: number, activity: ActivityLevel): number {
  return round(bmr * ACTIVITY_FACTORS[activity]);
}

export function validateBodyInputs(i: Pick<BodyInputs, 'ageYears' | 'heightCm' | 'weightKg'>): InputIssue[] {
  const issues: InputIssue[] = [];
  if (!Number.isFinite(i.ageYears) || i.ageYears < LIMITS.ageMin || i.ageYears > LIMITS.ageMax) issues.push('age_out_of_range');
  if (!Number.isFinite(i.heightCm) || i.heightCm < LIMITS.heightCmMin || i.heightCm > LIMITS.heightCmMax) issues.push('height_out_of_range');
  if (!Number.isFinite(i.weightKg) || i.weightKg < LIMITS.weightKgMin || i.weightKg > LIMITS.weightKgMax) issues.push('weight_out_of_range');
  if (issues.length === 0) {
    const b = bmi(i.weightKg, i.heightCm);
    if (b < 10 || b > 80) issues.push('bmi_implausible');
  }
  return issues;
}

/** Rounds to the nearest 10 kcal. */
function round10(n: number) {
  return Math.round(n / 10) * 10;
}

export function calorieTarget(tdeeKcal: number, bmrKcal: number, sex: Sex, goal: Goal): number {
  let target = tdeeKcal;
  if (goal === 'lose') target = tdeeKcal - Math.min(LOSE_CAP, tdeeKcal * LOSE_SHARE);
  if (goal === 'gain') target = tdeeKcal + Math.min(GAIN_CAP, tdeeKcal * GAIN_SHARE);
  if (goal === 'lose') {
    const floor = Math.max(bmrKcal, MIN_INTAKE[sex]);
    // Never prescribe below the floor, and never above maintenance when the floor exceeds it.
    target = Math.min(tdeeKcal, Math.max(target, floor));
  }
  return round10(target);
}

export type MacroTargets = { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };

export function macroTargets(calories: number, weightKg: number, goal: Goal): MacroTargets {
  let protein = weightKg * PROTEIN_G_PER_KG[goal];
  protein = Math.min(protein, (calories * PROTEIN_MAX_SHARE) / 4);
  const fat = (calories * FAT_SHARE) / 9;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return {
    calories,
    protein_g: round(protein),
    carbs_g: round(carbs),
    fat_g: round(fat),
    fiber_g: round((calories / 1000) * FIBER_G_PER_1000_KCAL),
  };
}

/** Grams from a calorie target and percentage split (must sum to 100). */
export function macrosFromPercentages(calories: number, proteinPct: number, carbsPct: number, fatPct: number): MacroTargets {
  const total = proteinPct + carbsPct + fatPct;
  if (Math.abs(total - 100) > 0.5) throw new Error('percentages_must_sum_to_100');
  return {
    calories,
    protein_g: round((calories * proteinPct) / 100 / 4),
    carbs_g: round((calories * carbsPct) / 100 / 4),
    fat_g: round((calories * fatPct) / 100 / 9),
    fiber_g: round((calories / 1000) * FIBER_G_PER_1000_KCAL),
  };
}

/** Energy implied by macronutrient grams (Atwater general factors). */
export function caloriesFromMacros(m: { protein_g: number; carbs_g: number; fat_g: number }): number {
  return round(m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9);
}

export type NutritionPlan =
  | {
      status: 'ok';
      bmi: number;
      bmiCategory: BmiCategory | null;
      bmr: number;
      tdee: number;
      targets: MacroTargets;
      notes: PlanNote[];
      formulaVersion: string;
      inputs: BodyInputs;
    }
  | { status: 'invalid'; issues: InputIssue[] }
  | { status: 'minor'; bmi: number; notes: PlanNote[] };

export type PlanNote = 'floor_applied' | 'goal_overridden_for_minor' | 'estimates_only' | 'bmi_low_no_deficit';

/**
 * Full plan for onboarding and the calculator.
 * - Under 18: no calorie target or deficit; the app tracks without a target.
 * - Underweight adults asking to lose weight: maintenance is suggested instead.
 */
export function buildNutritionPlan(inputs: BodyInputs): NutritionPlan {
  const issues = validateBodyInputs(inputs);
  if (issues.length) return { status: 'invalid', issues };

  const b = bmi(inputs.weightKg, inputs.heightCm);
  if (inputs.ageYears < LIMITS.adultAge) {
    return { status: 'minor', bmi: b, notes: ['goal_overridden_for_minor', 'estimates_only'] };
  }

  const notes: PlanNote[] = ['estimates_only'];
  let goal = inputs.goal;
  if (goal === 'lose' && b < 18.5) {
    goal = 'maintain';
    notes.push('bmi_low_no_deficit');
  }

  const bmrKcal = bmrMifflinStJeor(inputs.sex, inputs.weightKg, inputs.heightCm, inputs.ageYears);
  const tdeeKcal = tdee(bmrKcal, inputs.activity);
  const uncapped = goal === 'lose' ? tdeeKcal - Math.min(LOSE_CAP, tdeeKcal * LOSE_SHARE) : null;
  const calories = calorieTarget(tdeeKcal, bmrKcal, inputs.sex, goal);
  if (uncapped !== null && calories > round10(uncapped)) notes.push('floor_applied');

  return {
    status: 'ok',
    bmi: b,
    bmiCategory: bmiCategory(b, inputs.ageYears),
    bmr: bmrKcal,
    tdee: tdeeKcal,
    targets: macroTargets(calories, inputs.weightKg, goal),
    notes,
    formulaVersion: FORMULA_VERSION,
    inputs: { ...inputs, goal },
  };
}
