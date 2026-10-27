import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_FACTORS,
  ageFromDateOfBirth,
  bmi,
  bmiCategory,
  bmrMifflinStJeor,
  buildNutritionPlan,
  calorieTarget,
  caloriesFromMacros,
  macroTargets,
  macrosFromPercentages,
  tdee,
  validateBodyInputs,
} from '@/lib/nutrition/calc';

describe('BMI', () => {
  it('computes weight / height² to one decimal', () => {
    expect(bmi(70, 175)).toBe(22.9);
    expect(bmi(95, 180)).toBe(29.3);
  });

  it('uses adult WHO categories only for adults', () => {
    expect(bmiCategory(17.9, 30)).toBe('underweight');
    expect(bmiCategory(18.5, 30)).toBe('healthy');
    expect(bmiCategory(24.9, 30)).toBe('healthy');
    expect(bmiCategory(25, 30)).toBe('overweight');
    expect(bmiCategory(30, 30)).toBe('obesity');
    expect(bmiCategory(22, 15)).toBeNull();
  });
});

describe('BMR (Mifflin–St Jeor)', () => {
  it('matches the published male equation', () => {
    // 10×80 + 6.25×180 − 5×30 + 5 = 1780
    expect(bmrMifflinStJeor('male', 80, 180, 30)).toBe(1780);
  });

  it('matches the published female equation', () => {
    // 10×60 + 6.25×165 − 5×28 − 161 = 1330.25 → 1330
    expect(bmrMifflinStJeor('female', 60, 165, 28)).toBe(1330);
  });
});

describe('TDEE', () => {
  it('multiplies BMR by the activity factor', () => {
    expect(tdee(1780, 'sedentary')).toBe(Math.round(1780 * 1.2));
    expect(tdee(1780, 'moderate')).toBe(Math.round(1780 * 1.55));
    expect(Object.keys(ACTIVITY_FACTORS)).toHaveLength(5);
  });
});

describe('calorie targets', () => {
  it('keeps maintenance at TDEE', () => {
    expect(calorieTarget(2400, 1700, 'male', 'maintain')).toBe(2400);
  });

  it('uses a deficit of 15% capped at 500 kcal', () => {
    expect(calorieTarget(2000, 1400, 'female', 'lose')).toBe(1700); // 15% = 300
    expect(calorieTarget(4000, 2200, 'male', 'lose')).toBe(3500); // capped at 500
  });

  it('never drops below BMR or the minimum intake', () => {
    // TDEE 1500, 15% = 225 → 1275, but BMR 1350 is the floor.
    expect(calorieTarget(1500, 1350, 'female', 'lose')).toBe(1350);
    // Floor above TDEE: stay at maintenance rather than prescribing a deficit.
    expect(calorieTarget(1450, 1200, 'male', 'lose')).toBe(1450);
  });

  it('adds a surplus of 10% capped at 300 kcal', () => {
    expect(calorieTarget(2000, 1500, 'male', 'gain')).toBe(2200);
    expect(calorieTarget(3500, 2000, 'male', 'gain')).toBe(3800);
  });
});

describe('macronutrient targets', () => {
  it('stays consistent with the calorie target', () => {
    const m = macroTargets(2000, 70, 'maintain');
    expect(m.protein_g).toBe(84);
    expect(m.fat_g).toBe(67);
    expect(Math.abs(caloriesFromMacros(m) - 2000)).toBeLessThanOrEqual(10);
    expect(m.fiber_g).toBe(28);
  });

  it('caps protein at 35% of energy', () => {
    const m = macroTargets(1400, 150, 'lose');
    expect(m.protein_g * 4).toBeLessThanOrEqual(1400 * 0.35 + 2);
    expect(m.carbs_g).toBeGreaterThanOrEqual(0);
  });

  it('converts percentages and rejects splits that do not sum to 100', () => {
    const m = macrosFromPercentages(2000, 25, 45, 30);
    expect(m).toMatchObject({ protein_g: 125, carbs_g: 225, fat_g: 67 });
    expect(() => macrosFromPercentages(2000, 30, 30, 30)).toThrow();
  });
});

describe('input validation and plans', () => {
  it('rejects implausible values instead of producing results', () => {
    expect(validateBodyInputs({ ageYears: 30, heightCm: 90, weightKg: 70 })).toContain('height_out_of_range');
    expect(validateBodyInputs({ ageYears: 30, heightCm: 175, weightKg: 400 })).toContain('weight_out_of_range');
    expect(validateBodyInputs({ ageYears: 150, heightCm: 175, weightKg: 70 })).toContain('age_out_of_range');
    expect(validateBodyInputs({ ageYears: NaN, heightCm: 175, weightKg: 70 })).toContain('age_out_of_range');
    const plan = buildNutritionPlan({ ageYears: 30, sex: 'male', heightCm: 100, weightKg: 70, activity: 'light', goal: 'maintain' });
    expect(plan.status).toBe('invalid');
  });

  it('never creates a calorie target or deficit for minors', () => {
    const plan = buildNutritionPlan({ ageYears: 15, sex: 'female', heightCm: 160, weightKg: 60, activity: 'moderate', goal: 'lose' });
    expect(plan.status).toBe('minor');
    expect(plan).not.toHaveProperty('targets');
  });

  it('switches underweight adults from loss to maintenance', () => {
    const plan = buildNutritionPlan({ ageYears: 25, sex: 'female', heightCm: 170, weightKg: 50, activity: 'light', goal: 'lose' });
    expect(plan.status).toBe('ok');
    if (plan.status === 'ok') {
      expect(plan.inputs.goal).toBe('maintain');
      expect(plan.notes).toContain('bmi_low_no_deficit');
      expect(plan.targets.calories).toBe(Math.round(plan.tdee / 10) * 10);
    }
  });

  it('records the formula version and inputs', () => {
    const plan = buildNutritionPlan({ ageYears: 30, sex: 'male', heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'maintain' });
    expect(plan.status).toBe('ok');
    if (plan.status === 'ok') {
      expect(plan.bmr).toBe(1780);
      expect(plan.tdee).toBe(2759);
      expect(plan.targets.calories).toBe(2760);
      expect(plan.formulaVersion).toMatch(/msj1990/);
    }
  });

  it('computes age from date of birth around the birthday', () => {
    expect(ageFromDateOfBirth('1990-06-15', new Date('2026-06-14T12:00:00Z'))).toBe(35);
    expect(ageFromDateOfBirth('1990-06-15', new Date('2026-06-15T12:00:00Z'))).toBe(36);
  });
});
