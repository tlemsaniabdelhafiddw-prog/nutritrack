/**
 * USDA FoodData Central (https://fdc.nal.usda.gov). Data is public domain (CC0 1.0);
 * an API key from api.data.gov is required. Default limit: 1,000 requests per hour per key.
 * Foundation and SR Legacy foods report nutrients per 100 g.
 */

import type { Per100 } from '../nutrition/portions';

export const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1';
export const FDC_DATA_TYPES = ['Foundation', 'SR Legacy'];

type FdcNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: { id?: number; number?: string; unitName?: string };
};

export type FdcFood = { fdcId: number; description: string; dataType?: string; foodNutrients?: FdcNutrient[] };

export type UsdaFood = { fdcId: number; name: string; dataType: string; per100: Per100 };

function read(n: FdcNutrient) {
  return {
    id: n.nutrientId ?? n.nutrient?.id,
    number: n.nutrientNumber ?? n.nutrient?.number,
    unit: (n.unitName ?? n.nutrient?.unitName ?? '').toUpperCase(),
    value: Number(n.value ?? n.amount ?? NaN),
  };
}

function pick(list: ReturnType<typeof read>[], ids: number[], numbers: string[], unit?: string): number | null {
  for (const id of ids) {
    const hit = list.find((n) => n.id === id && Number.isFinite(n.value) && (!unit || n.unit === unit));
    if (hit) return hit.value;
  }
  for (const num of numbers) {
    const hit = list.find((n) => n.number === num && Number.isFinite(n.value) && (!unit || n.unit === unit));
    if (hit) return hit.value;
  }
  return null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Extracts per-100 g energy and macronutrients. Returns null if protein/fat/carbs are missing. */
export function parseFdcFood(food: FdcFood): UsdaFood | null {
  const list = (food.foodNutrients ?? []).map(read);
  const protein = pick(list, [1003], ['203']);
  const fat = pick(list, [1004], ['204']);
  const carbs = pick(list, [1005], ['205']);
  if (protein === null || fat === null || carbs === null) return null;
  const fiber = pick(list, [1079], ['291']);
  let kcal = pick(list, [1008], ['208'], 'KCAL') ?? pick(list, [2047, 2048], ['957', '958'], 'KCAL');
  if (kcal === null) kcal = protein * 4 + carbs * 4 + fat * 9;
  if (kcal > 950 || protein > 100 || fat > 100 || carbs > 100) return null;
  return {
    fdcId: food.fdcId,
    name: food.description,
    dataType: food.dataType ?? 'unknown',
    per100: { kcal_100g: r1(kcal), protein_100g: r1(protein), carbs_100g: r1(carbs), fat_100g: r1(fat), fiber_100g: fiber === null ? null : r1(fiber) },
  };
}

export class UsdaError extends Error {
  constructor(public code: 'not_configured' | 'unavailable' | 'rate_limited' | 'not_found') {
    super(code);
  }
}

async function fdcFetch(path: string, apiKey: string, init?: RequestInit) {
  const url = `${FDC_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  } catch {
    throw new UsdaError('unavailable');
  }
  if (res.status === 429) throw new UsdaError('rate_limited');
  if (res.status === 404) throw new UsdaError('not_found');
  if (!res.ok) throw new UsdaError('unavailable');
  return res.json();
}

export async function searchUsda(query: string, apiKey: string, pageSize = 12): Promise<UsdaFood[]> {
  if (!apiKey) throw new UsdaError('not_configured');
  const body = await fdcFetch('/foods/search', apiKey, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, dataType: FDC_DATA_TYPES, pageSize }),
  });
  const foods: FdcFood[] = Array.isArray(body?.foods) ? body.foods : [];
  return foods.map(parseFdcFood).filter((f): f is UsdaFood => f !== null);
}

export async function getUsdaFood(fdcId: number, apiKey: string): Promise<UsdaFood> {
  if (!apiKey) throw new UsdaError('not_configured');
  const body = await fdcFetch(`/food/${fdcId}`, apiKey);
  const parsed = parseFdcFood(body as FdcFood);
  if (!parsed) throw new UsdaError('not_found');
  return parsed;
}
