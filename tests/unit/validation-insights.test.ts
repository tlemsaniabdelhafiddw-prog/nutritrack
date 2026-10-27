import { describe, expect, it } from 'vitest';
import { mealCreateInput, onboardingInput, recipeLogInput, targetsInput, weightInput } from '@/lib/validation';
import { generateInsights, type InsightInput } from '@/lib/insights';
import { negotiateLocale } from '@/i18n/config';

const item = {
  name: 'Rice',
  grams: 150,
  food_id: null,
  nutrient_source: 'manual' as const,
  per100: { kcal_100g: 130, protein_100g: 2.7, carbs_100g: 28.2, fat_100g: 0.3, fiber_100g: 0.4 },
};
const meal = {
  client_request_id: '7d3f1c2e-6a4b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'Lunch',
  category: 'lunch',
  date: '2026-10-27',
  time: '13:15',
  source: 'manual',
  items: [item],
};

describe('input validation', () => {
  it('accepts a valid meal and strips control characters', () => {
    const parsed = mealCreateInput.parse({ ...meal, name: '  Lunch\u0007 ' });
    expect(parsed.name).toBe('Lunch');
  });

  it('rejects bad meals', () => {
    expect(mealCreateInput.safeParse({ ...meal, items: [] }).success).toBe(false);
    expect(mealCreateInput.safeParse({ ...meal, date: '2026-13-01' }).success).toBe(false);
    expect(mealCreateInput.safeParse({ ...meal, time: '25:00' }).success).toBe(false);
    expect(mealCreateInput.safeParse({ ...meal, category: 'brunch' }).success).toBe(false);
    expect(mealCreateInput.safeParse({ ...meal, items: [{ ...item, grams: 0 }] }).success).toBe(false);
    expect(mealCreateInput.safeParse({ ...meal, items: [{ ...item, per100: { ...item.per100, fat_100g: 120 } }] }).success).toBe(false);
    expect(mealCreateInput.safeParse({ ...meal, client_request_id: 'abc' }).success).toBe(false);
  });

  it('validates recipe logs, weights and targets', () => {
    expect(recipeLogInput.safeParse({ client_request_id: meal.client_request_id, servings: 0, category: 'dinner', date: '2026-10-27', time: '20:00' }).success).toBe(false);
    expect(weightInput.safeParse({ measured_on: '2026-10-27', weight_kg: 15 }).success).toBe(false);
    expect(targetsInput.safeParse({ calories: 500, protein_g: 50, carbs_g: 50, fat_g: 10, fiber_g: null, is_custom: true }).success).toBe(false);
  });

  it('requires a valid timezone during onboarding', () => {
    const base = {
      profile: {
        display_name: 'Amina',
        date_of_birth: '1995-03-02',
        sex: 'female',
        height_cm: 165,
        weight_kg: 62,
        target_weight_kg: null,
        activity_level: 'light',
        goal: 'maintain',
        units: 'metric',
        locale: 'ar',
        timezone: 'Africa/Algiers',
      },
      preferences: { dietary_preferences: ['halal'], allergies: ['peanuts'], restrictions_note: null, water_goal_ml: 2000, keep_meal_photos: true },
      targets: null,
    };
    expect(onboardingInput.safeParse(base).success).toBe(true);
    expect(onboardingInput.safeParse({ ...base, profile: { ...base.profile, timezone: 'Mars/Olympus' } }).success).toBe(false);
  });
});

describe('coach insights', () => {
  const base: InsightInput = {
    localHour: 19,
    today: { kcal: 1200, protein_g: 30, carbs_g: 150, fat_g: 40, fiber_g: 8 },
    targets: { calories: 2000, protein_g: 90, fiber_g: 28 },
    mealCountToday: 2,
    categoriesToday: ['breakfast', 'lunch'],
    totalMealsEver: 40,
    daysLoggedLast7: 6,
    waterTodayMl: 500,
    waterGoalMl: 2000,
    recentWeights: [],
  };

  it('only states what the data supports', () => {
    const keys = generateInsights(base).map((i) => i.key);
    expect(keys).toContain('protein_below_target');
    expect(keys).toContain('fiber_low_suggest_veg');
    expect(keys.length).toBeLessThanOrEqual(3);
  });

  it('asks new users to start logging rather than guessing', () => {
    expect(generateInsights({ ...base, totalMealsEver: 0 })).toEqual([{ key: 'start_logging' }]);
  });

  it('says when there is not enough information', () => {
    expect(
      generateInsights({ ...base, localHour: 9, mealCountToday: 0, categoriesToday: [], daysLoggedLast7: 1, waterTodayMl: 0 }),
    ).toEqual([{ key: 'not_enough_data' }]);
  });

  it('mentions a missed lunch only in the afternoon', () => {
    const afternoon = generateInsights({ ...base, localHour: 16, categoriesToday: ['breakfast'], mealCountToday: 1 });
    expect(afternoon.map((i) => i.key)).toContain('lunch_not_logged');
    const morning = generateInsights({ ...base, localHour: 10, categoriesToday: ['breakfast'], mealCountToday: 1 });
    expect(morning.map((i) => i.key)).not.toContain('lunch_not_logged');
  });

  it('describes weight trends only with enough measurements', () => {
    const trend = generateInsights({
      ...base,
      mealCountToday: 0,
      daysLoggedLast7: 2,
      recentWeights: [
        { date: '2026-10-10', kg: 70 },
        { date: '2026-10-17', kg: 69.6 },
        { date: '2026-10-24', kg: 69.2 },
      ],
    });
    expect(trend.find((i) => i.key === 'weight_trend')).toMatchObject({ params: { change: -0.8, days: 14, entries: 3 } });
    const few = generateInsights({ ...base, mealCountToday: 0, daysLoggedLast7: 2, recentWeights: [{ date: '2026-10-24', kg: 70 }] });
    expect(few.map((i) => i.key)).toContain('weight_needs_more_entries');
  });
});

describe('locale negotiation', () => {
  it('picks the best supported language', () => {
    expect(negotiateLocale('ar-DZ,ar;q=0.9,fr;q=0.8')).toBe('ar');
    expect(negotiateLocale('fr-FR,fr;q=0.9')).toBe('fr');
    expect(negotiateLocale('de-DE,es;q=0.5')).toBe('en');
    expect(negotiateLocale(null)).toBe('en');
  });
});
