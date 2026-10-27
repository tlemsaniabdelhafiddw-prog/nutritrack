import { describe, expect, it } from 'vitest';
import {
  cmToFtIn,
  ftInToCm,
  kgToLb,
  lbToKg,
  nutrientsForPortion,
  per100FromPortion,
  recipeServingNutrients,
  sumNutrients,
} from '@/lib/nutrition/portions';
import { addDays, isLocalDate, localDateFor, startOfWeek, timeZoneOffsetMinutes, zonedTimeToUtc } from '@/lib/dates';
import { buildShoppingList } from '@/lib/shopping';

const rice = { kcal_100g: 130, protein_100g: 2.7, carbs_100g: 28.2, fat_100g: 0.3, fiber_100g: 0.4 };

describe('portion calculations', () => {
  it('scales per-100 g values by portion grams', () => {
    expect(nutrientsForPortion(rice, 150)).toEqual({ kcal: 195, protein_g: 4.1, carbs_g: 42.3, fat_g: 0.5, fiber_g: 0.6 });
    expect(nutrientsForPortion(rice, 0).kcal).toBe(0);
  });

  it('treats missing fiber as zero for the portion but keeps the source null', () => {
    const n = nutrientsForPortion({ ...rice, fiber_100g: null }, 100);
    expect(n.fiber_g).toBe(0);
  });

  it('rejects negative or non-numeric grams', () => {
    expect(() => nutrientsForPortion(rice, -5)).toThrow();
    expect(() => nutrientsForPortion(rice, Number.NaN)).toThrow();
  });

  it('converts a portion estimate back to per-100 g', () => {
    expect(per100FromPortion({ kcal: 88, protein_g: 0, carbs_g: 0, fat_g: 10 }, 10)).toMatchObject({ kcal_100g: 880, fat_100g: 100 });
  });

  it('sums meal totals', () => {
    const t = sumNutrients([nutrientsForPortion(rice, 150), { kcal: 119.3, protein_g: 0, carbs_g: 0, fat_g: 13.5, fiber_g: 0 }, null]);
    expect(t.kcal).toBe(314.3);
    expect(t.fat_g).toBe(14);
  });

  it('scales recipe servings', () => {
    const per = { kcal_per_serving: 331.9, protein_per_serving: 18.2, carbs_per_serving: 29, fat_per_serving: 17.6, fiber_per_serving: 7.7 };
    expect(recipeServingNutrients(per, 1.5)).toEqual({ kcal: 497.9, protein_g: 27.3, carbs_g: 43.5, fat_g: 26.4, fiber_g: 11.6 });
    expect(() => recipeServingNutrients(per, -1)).toThrow();
  });

  it('converts units both ways', () => {
    expect(kgToLb(70)).toBe(154.3);
    expect(lbToKg(154.3)).toBe(70);
    expect(cmToFtIn(180)).toEqual({ ft: 5, inches: 11 });
    expect(ftInToCm(5, 11)).toBe(180.3);
    expect(cmToFtIn(182.8)).toEqual({ ft: 6, inches: 0 });
  });
});

describe('date boundaries for daily totals', () => {
  it('assigns a late-evening meal to the local day, not the UTC day', () => {
    // 23:30 in Algiers (UTC+1) on 27 Oct is 22:30 UTC the same day.
    expect(localDateFor(new Date('2026-10-27T22:30:00Z'), 'Africa/Algiers')).toBe('2026-10-27');
    // 00:30 in Algiers on 28 Oct is still 27 Oct in UTC.
    expect(localDateFor(new Date('2026-10-27T23:30:00Z'), 'Africa/Algiers')).toBe('2026-10-28');
    // West of UTC the shift goes the other way.
    expect(localDateFor(new Date('2026-10-28T03:00:00Z'), 'America/New_York')).toBe('2026-10-27');
  });

  it('round-trips wall-clock time through UTC', () => {
    const instant = zonedTimeToUtc('2026-10-27', '23:30', 'Africa/Algiers');
    expect(instant.toISOString()).toBe('2026-10-27T22:30:00.000Z');
    expect(localDateFor(instant, 'Africa/Algiers')).toBe('2026-10-27');
  });

  it('handles daylight-saving changes', () => {
    // Paris switches from UTC+2 to UTC+1 on 25 Oct 2026 at 03:00.
    expect(timeZoneOffsetMinutes(new Date('2026-10-24T12:00:00Z'), 'Europe/Paris')).toBe(120);
    expect(timeZoneOffsetMinutes(new Date('2026-10-26T12:00:00Z'), 'Europe/Paris')).toBe(60);
    expect(zonedTimeToUtc('2026-10-26', '08:00', 'Europe/Paris').toISOString()).toBe('2026-10-26T07:00:00.000Z');
  });

  it('falls back to UTC for an unknown timezone', () => {
    expect(localDateFor(new Date('2026-10-27T23:30:00Z'), 'Not/AZone')).toBe('2026-10-27');
  });

  it('does calendar arithmetic across months and weeks', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(startOfWeek('2026-10-29')).toBe('2026-10-26'); // Thursday → Monday
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-10-27')).toBe(true);
  });
});

describe('shopping list', () => {
  it('scales by servings and merges duplicates by food', () => {
    const list = buildShoppingList([
      { foodId: 'onion', name: 'Onion', quantity: 1, unit: 'piece', grams: 110, scale: 2 },
      { foodId: 'onion', name: 'Onion', quantity: 0.5, unit: 'piece', grams: 55, scale: 1 },
      { foodId: 'oil', name: 'Olive oil', quantity: 1, unit: 'tbsp', grams: 13.5, scale: 1 },
      { foodId: 'oil', name: 'Olive oil', quantity: 30, unit: 'ml', grams: 27, scale: 1 },
    ]);
    const onion = list.find((l) => l.key === 'onion')!;
    expect(onion).toMatchObject({ quantity: 2.5, unit: 'piece', grams: 275 });
    const oil = list.find((l) => l.key === 'oil')!;
    // Mixed units: quantity is dropped, grams are still summed.
    expect(oil).toMatchObject({ quantity: null, unit: null, grams: 41 });
  });

  it('ignores zero-servings entries', () => {
    expect(buildShoppingList([{ foodId: null, name: 'Salt', quantity: 1, unit: 'tsp', grams: 5, scale: 0 }])).toEqual([]);
  });
});
