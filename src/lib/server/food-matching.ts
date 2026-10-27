import 'server-only';
import type { ServerSupabase } from '../supabase/server';
import type { Tables } from '../supabase/database.types';
import type { AnalysisItem, AnalysisWarning, MealAnalysis } from '../ai/schema';
import { bestMatch } from '../ai/match-score';
import { per100FromPortion, type Per100 } from '../nutrition/portions';

export type FoodMatch = {
  food_id: string;
  name: string;
  name_fr: string | null;
  name_ar: string | null;
  source: string;
  serving_unit: string | null;
  serving_grams: number | null;
  per100: Per100;
  score: number;
};

export type ReviewItem = {
  name: string;
  grams: number;
  identification_confidence: AnalysisItem['identification_confidence'];
  portion_confidence: AnalysisItem['portion_confidence'];
  notes: string | null;
  ai: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null; per100: Per100 };
  match: FoodMatch | null;
  energy_mismatch: boolean;
};

const toPer100 = (f: Tables<'foods'>): Per100 => ({
  kcal_100g: Number(f.kcal_100g),
  protein_100g: Number(f.protein_100g),
  carbs_100g: Number(f.carbs_100g),
  fat_100g: Number(f.fat_100g),
  fiber_100g: f.fiber_100g === null ? null : Number(f.fiber_100g),
});

/** Keeps model-derived per-100 g values within physical limits (fat cannot exceed 100 g per 100 g). */
function clampPer100(p: Per100): Per100 {
  const c = (n: number, max: number) => Math.min(Math.max(n, 0), max);
  return {
    kcal_100g: c(p.kcal_100g, 900),
    protein_100g: c(p.protein_100g, 100),
    carbs_100g: c(p.carbs_100g, 100),
    fat_100g: c(p.fat_100g, 100),
    fiber_100g: p.fiber_100g === null ? null : c(p.fiber_100g, 100),
  };
}

/**
 * Matches each detected item to the food catalog. Database values replace model guesses
 * only when the match is confident; otherwise the item keeps the clearly labelled AI estimate.
 */
export async function matchAnalysisToFoods(supabase: ServerSupabase, analysis: MealAnalysis, warnings: AnalysisWarning[]): Promise<ReviewItem[]> {
  return Promise.all(
    analysis.items.map(async (item, index) => {
      let match: FoodMatch | null = null;
      for (const term of [item.search_term, item.name]) {
        const { data } = await supabase.rpc('search_foods', { q: term.split(',')[0].trim(), max_results: 10 });
        const best = data?.length ? bestMatch(item.search_term, data) : null;
        if (best) {
          const f = best.food;
          match = {
            food_id: f.id,
            name: f.name,
            name_fr: f.name_fr,
            name_ar: f.name_ar,
            source: f.source,
            serving_unit: f.serving_unit,
            serving_grams: f.serving_grams === null ? null : Number(f.serving_grams),
            per100: toPer100(f),
            score: best.score,
          };
          break;
        }
      }
      return {
        name: item.name,
        grams: Math.round(item.estimated_grams),
        identification_confidence: item.identification_confidence,
        portion_confidence: item.portion_confidence,
        notes: item.notes,
        ai: {
          kcal: item.kcal,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          per100: clampPer100(
            per100FromPortion({ kcal: item.kcal, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g, fiber_g: item.fiber_g ?? undefined }, item.estimated_grams),
          ),
        },
        match,
        energy_mismatch: warnings.some((w) => w.itemIndex === index),
      };
    }),
  );
}
