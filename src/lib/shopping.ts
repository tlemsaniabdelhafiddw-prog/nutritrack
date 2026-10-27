/**
 * Builds a shopping list from planned recipes. Ingredients are scaled by
 * planned servings ÷ recipe servings and duplicates are merged by food (or name).
 * Quantities are summed only when units match; grams are always summed.
 */

export type PlannedIngredient = {
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  scale: number; // planned servings / recipe servings
};

export type ShoppingLine = {
  key: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  grams: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildShoppingList(ingredients: PlannedIngredient[]): ShoppingLine[] {
  const map = new Map<string, ShoppingLine & { units: Set<string> }>();
  for (const ing of ingredients) {
    if (!(ing.scale > 0)) continue;
    const key = ing.foodId ?? `name:${ing.name.trim().toLowerCase()}`;
    const qty = ing.quantity * ing.scale;
    const grams = ing.grams * ing.scale;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { key, name: ing.name, quantity: qty, unit: ing.unit, grams, units: new Set([ing.unit]) });
      continue;
    }
    existing.grams += grams;
    existing.units.add(ing.unit);
    if (existing.units.size === 1 && existing.quantity !== null) existing.quantity += qty;
    else {
      existing.quantity = null;
      existing.unit = null;
    }
  }
  return [...map.values()]
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop the helper set
    .map(({ units: _units, ...line }) => ({
      ...line,
      quantity: line.quantity === null ? null : r2(line.quantity),
      grams: Math.round(line.grams),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
