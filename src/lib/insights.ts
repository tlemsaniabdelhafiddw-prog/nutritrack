/**
 * Data-grounded coaching notes. Every insight is derived from numbers the user logged;
 * when there isn't enough data, the function says so instead of guessing.
 * Messages are i18n keys; wording lives in the dictionaries and avoids judgment.
 */

import type { Nutrients } from './nutrition/portions';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type InsightInput = {
  localHour: number;
  today: Nutrients;
  targets: { calories: number; protein_g: number; fiber_g: number | null } | null;
  mealCountToday: number;
  categoriesToday: MealCategory[];
  totalMealsEver: number;
  daysLoggedLast7: number;
  waterTodayMl: number;
  waterGoalMl: number;
  /** Weight entries in the last 21 days, oldest first. */
  recentWeights: { date: string; kg: number }[];
};

export type Insight =
  | { key: 'start_logging' }
  | { key: 'not_enough_data' }
  | { key: 'protein_below_target'; params: { logged: number; target: number } }
  | { key: 'fiber_low_suggest_veg'; params: { logged: number; target: number } }
  | { key: 'lunch_not_logged' }
  | { key: 'breakfast_not_logged' }
  | { key: 'water_below_goal'; params: { logged: number; goal: number } }
  | { key: 'logging_consistent'; params: { days: number } }
  | { key: 'weight_trend'; params: { change: number; days: number; entries: number } }
  | { key: 'weight_needs_more_entries'; params: { entries: number } };

export function generateInsights(i: InsightInput): Insight[] {
  if (i.totalMealsEver === 0) return [{ key: 'start_logging' }];

  const out: Insight[] = [];

  if (i.targets && i.mealCountToday >= 2) {
    if (i.today.protein_g < i.targets.protein_g * 0.6 && i.localHour >= 17) {
      out.push({ key: 'protein_below_target', params: { logged: Math.round(i.today.protein_g), target: Math.round(i.targets.protein_g) } });
    }
    if (i.targets.fiber_g && i.today.fiber_g < i.targets.fiber_g * 0.5 && i.localHour >= 17) {
      out.push({ key: 'fiber_low_suggest_veg', params: { logged: Math.round(i.today.fiber_g), target: Math.round(i.targets.fiber_g) } });
    }
  }

  if (i.localHour >= 11 && i.localHour < 15 && !i.categoriesToday.includes('breakfast') && i.mealCountToday === 0) {
    out.push({ key: 'breakfast_not_logged' });
  }
  if (i.localHour >= 15 && !i.categoriesToday.includes('lunch')) out.push({ key: 'lunch_not_logged' });

  if (i.localHour >= 16 && i.waterGoalMl > 0 && i.waterTodayMl > 0 && i.waterTodayMl < i.waterGoalMl * 0.5) {
    out.push({ key: 'water_below_goal', params: { logged: i.waterTodayMl, goal: i.waterGoalMl } });
  }

  if (i.daysLoggedLast7 >= 5) out.push({ key: 'logging_consistent', params: { days: i.daysLoggedLast7 } });

  if (i.recentWeights.length >= 3) {
    const first = i.recentWeights[0];
    const last = i.recentWeights[i.recentWeights.length - 1];
    const days = Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86400000);
    if (days >= 7) {
      out.push({
        key: 'weight_trend',
        params: { change: Math.round((last.kg - first.kg) * 10) / 10, days, entries: i.recentWeights.length },
      });
    } else {
      out.push({ key: 'weight_needs_more_entries', params: { entries: i.recentWeights.length } });
    }
  } else if (i.recentWeights.length > 0) {
    out.push({ key: 'weight_needs_more_entries', params: { entries: i.recentWeights.length } });
  }

  return out.length ? out.slice(0, 3) : [{ key: 'not_enough_data' }];
}
