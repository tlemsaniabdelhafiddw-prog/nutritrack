'use client';

import { useT } from '@/i18n/client';
import { caloriesFromMacros } from '@/lib/nutrition/calc';
import { Field, Input, parseDecimal } from '../ui/field';
import { Notice } from '../ui/surface';

export type TargetDraft = { calories: string; protein_g: string; carbs_g: string; fat_g: string; fiber_g: string };

export function draftFrom(t: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null }): TargetDraft {
  return { calories: String(t.calories), protein_g: String(t.protein_g), carbs_g: String(t.carbs_g), fat_g: String(t.fat_g), fiber_g: t.fiber_g === null ? '' : String(t.fiber_g) };
}

export function parseDraft(d: TargetDraft) {
  const calories = parseDecimal(d.calories);
  const protein = parseDecimal(d.protein_g);
  const carbs = parseDecimal(d.carbs_g);
  const fat = parseDecimal(d.fat_g);
  if (calories === null || protein === null || carbs === null || fat === null) return null;
  return { calories: Math.round(calories), protein_g: protein, carbs_g: carbs, fat_g: fat, fiber_g: parseDecimal(d.fiber_g) };
}

/** Editable calorie and macro targets with a live consistency check (4/4/9 kcal per g). */
export function TargetsEditor({ draft, onChange }: { draft: TargetDraft; onChange: (d: TargetDraft) => void }) {
  const t = useT();
  const parsed = parseDraft(draft);
  const implied = parsed ? caloriesFromMacros(parsed) : null;
  const mismatch = parsed && implied !== null && Math.abs(implied - parsed.calories) / parsed.calories > 0.05;
  const outOfRange = parsed && (parsed.calories < 800 || parsed.calories > 6000);
  const input = (k: keyof TargetDraft, label: string, unit: string) => (
    <Field label={`${label} (${unit})`} optional={k === 'fiber_g' ? t('common.optional') : undefined}>
      {({ id }) => <Input id={id} inputMode="decimal" className="tabular" value={draft[k]} onChange={(e) => onChange({ ...draft, [k]: e.target.value })} />}
    </Field>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {input('calories', t('targets.calories'), t('common.kcal'))}
        {input('protein_g', t('targets.protein'), 'g')}
        {input('carbs_g', t('targets.carbs'), 'g')}
        {input('fat_g', t('targets.fat'), 'g')}
        {input('fiber_g', t('targets.fiber'), 'g')}
      </div>
      {!parsed && <Notice tone="error">{t('common.errorValidation')}</Notice>}
      {outOfRange && <Notice tone="error">{t('common.errorValidation')}</Notice>}
      {mismatch && <Notice tone="warn">{t('targets.macroMismatch', { kcal: implied! })}</Notice>}
    </div>
  );
}

export function targetsValid(d: TargetDraft) {
  const p = parseDraft(d);
  if (!p || p.calories < 800 || p.calories > 6000) return false;
  return Math.abs(caloriesFromMacros(p) - p.calories) / p.calories <= 0.05;
}
