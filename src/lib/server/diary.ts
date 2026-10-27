import 'server-only';
import type { ServerSupabase } from '../supabase/server';
import type { Tables } from '../supabase/database.types';
import { sumNutrients, type Nutrients } from '../nutrition/portions';
import { addDays, dateRange, localHourFor, type LocalDate } from '../dates';
import { generateInsights, type Insight, type MealCategory } from '../insights';
import { dbCheck } from '../api';
import { signPhotoUrls } from './meals';

export type DiaryMeal = Tables<'meals'> & {
  items: Tables<'meal_items'>[];
  totals: Nutrients;
  photoUrl: string | null;
};

export type DaySummary = {
  date: LocalDate;
  meals: DiaryMeal[];
  totals: Nutrients;
  waterMl: number;
  waterEntries: { id: string; amount_ml: number; logged_at: string }[];
};

const num = (v: unknown) => Number(v ?? 0);

export async function getDay(supabase: ServerSupabase, userId: string, date: LocalDate): Promise<DaySummary> {
  const [mealsRes, waterRes] = await Promise.all([
    supabase
      .from('meals')
      .select('*, items:meal_items(*)')
      .eq('user_id', userId)
      .eq('local_date', date)
      .order('eaten_at', { ascending: true }),
    supabase.from('water_entries').select('id, amount_ml, logged_at').eq('user_id', userId).eq('local_date', date).order('logged_at'),
  ]);
  const rows = dbCheck(mealsRes, 'load day meals') ?? [];
  const water = dbCheck(waterRes, 'load water') ?? [];
  const urls = await signPhotoUrls(supabase, rows.map((m) => m.photo_path ?? ''));

  const meals: DiaryMeal[] = rows.map((m) => {
    const items = [...(m.items ?? [])].sort((a, b) => a.position - b.position);
    return {
      ...m,
      items,
      totals: sumNutrients(items.map((i) => ({ kcal: num(i.kcal), protein_g: num(i.protein_g), carbs_g: num(i.carbs_g), fat_g: num(i.fat_g), fiber_g: num(i.fiber_g) }))),
      photoUrl: m.photo_path ? urls[m.photo_path] ?? null : null,
    };
  });

  return {
    date,
    meals,
    totals: sumNutrients(meals.map((m) => m.totals)),
    waterMl: water.reduce((s, w) => s + w.amount_ml, 0),
    waterEntries: water,
  };
}

export type DailyTotal = { date: LocalDate; kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; meals: number };

/** Totals per local date for a range (inclusive). Days with no meals are returned with zeros and meals = 0. */
export async function getDailyTotals(supabase: ServerSupabase, userId: string, from: LocalDate, to: LocalDate): Promise<DailyTotal[]> {
  const res = await supabase
    .from('meal_totals')
    .select('local_date, kcal, protein_g, carbs_g, fat_g, fiber_g')
    .eq('user_id', userId)
    .gte('local_date', from)
    .lte('local_date', to);
  const rows = dbCheck(res, 'load totals') ?? [];
  const byDate = new Map<string, DailyTotal>();
  for (const d of dateRange(from, to)) byDate.set(d, { date: d, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, meals: 0 });
  for (const r of rows) {
    const d = byDate.get(r.local_date ?? '');
    if (!d) continue;
    d.kcal += num(r.kcal);
    d.protein_g += num(r.protein_g);
    d.carbs_g += num(r.carbs_g);
    d.fat_g += num(r.fat_g);
    d.fiber_g += num(r.fiber_g);
    d.meals += 1;
  }
  return [...byDate.values()].map((d) => ({
    ...d,
    kcal: Math.round(d.kcal),
    protein_g: Math.round(d.protein_g * 10) / 10,
    carbs_g: Math.round(d.carbs_g * 10) / 10,
    fat_g: Math.round(d.fat_g * 10) / 10,
    fiber_g: Math.round(d.fiber_g * 10) / 10,
  }));
}

export async function getWeights(supabase: ServerSupabase, userId: string, from?: LocalDate) {
  let q = supabase.from('weight_entries').select('id, measured_on, weight_kg, note').eq('user_id', userId).order('measured_on', { ascending: true });
  if (from) q = q.gte('measured_on', from);
  return (dbCheck(await q, 'load weights') ?? []).map((w) => ({ ...w, weight_kg: Number(w.weight_kg) }));
}

export async function getInsightsFor(
  supabase: ServerSupabase,
  userId: string,
  args: {
    today: DaySummary;
    timeZone: string;
    targets: Tables<'nutrition_targets'> | null;
    waterGoalMl: number;
    last7: DailyTotal[];
  },
): Promise<Insight[]> {
  const [{ count }, weights] = await Promise.all([
    supabase.from('meals').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    getWeights(supabase, userId, addDays(args.today.date, -21)),
  ]);
  return generateInsights({
    localHour: localHourFor(new Date(), args.timeZone),
    today: args.today.totals,
    targets: args.targets
      ? { calories: args.targets.calories, protein_g: Number(args.targets.protein_g), fiber_g: args.targets.fiber_g === null ? null : Number(args.targets.fiber_g) }
      : null,
    mealCountToday: args.today.meals.length,
    categoriesToday: args.today.meals.map((m) => m.category as MealCategory),
    totalMealsEver: count ?? 0,
    daysLoggedLast7: args.last7.filter((d) => d.meals > 0).length,
    waterTodayMl: args.today.waterMl,
    waterGoalMl: args.waterGoalMl,
    recentWeights: weights.map((w) => ({ date: w.measured_on, kg: w.weight_kg })),
  });
}
