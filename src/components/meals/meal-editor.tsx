'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus, Search, Trash2, TriangleAlert, Droplet } from 'lucide-react';
import { useT } from '@/i18n/client';
import { nutrientsForPortion, sumNutrients, type Per100 } from '@/lib/nutrition/portions';
import { Button } from '../ui/button';
import { Field, Input, Select, parseDecimal } from '../ui/field';
import { Badge, Card, Notice } from '../ui/surface';
import { Dialog } from '../ui/dialog';
import { FoodSearch, foodName, type Food } from '../food/food-search';
import { cn } from '@/lib/cn';

export type Confidence = 'low' | 'medium' | 'high';

export type EditorItem = {
  key: string;
  name: string;
  grams: string;
  food_id: string | null;
  nutrient_source: 'database' | 'ai_estimate' | 'manual';
  per100: Per100;
  serving: { unit: string; grams: number } | null;
  /** Present for items from photo analysis. */
  scan?: {
    identification_confidence: Confidence;
    portion_confidence: Confidence;
    notes: string | null;
    energy_mismatch: boolean;
    aiPer100: Per100;
    dbFood: { id: string; name: string; source: string; per100: Per100 } | null;
  };
};

export type MealMeta = { name: string; category: 'breakfast' | 'lunch' | 'dinner' | 'snack'; date: string; time: string };

let keySeq = 0;
export const newKey = () => `item-${Date.now()}-${keySeq++}`;

export function itemFromFood(food: Food, locale: string, grams?: number): EditorItem {
  const serving = food.serving_grams ? { unit: food.serving_unit ?? 'serving', grams: Number(food.serving_grams) } : null;
  return {
    key: newKey(),
    name: foodName(food, locale),
    grams: String(grams ?? serving?.grams ?? 100),
    food_id: food.id,
    nutrient_source: 'database',
    per100: {
      kcal_100g: Number(food.kcal_100g),
      protein_100g: Number(food.protein_100g),
      carbs_100g: Number(food.carbs_100g),
      fat_100g: Number(food.fat_100g),
      fiber_100g: food.fiber_100g === null ? null : Number(food.fiber_100g),
    },
    serving,
  };
}

export function itemNutrients(i: EditorItem) {
  const g = parseDecimal(i.grams);
  return g && g > 0 ? nutrientsForPortion(i.per100, g) : null;
}

type Props = {
  items: EditorItem[];
  onItemsChange: (items: EditorItem[]) => void;
  meta: MealMeta;
  onMetaChange: (m: MealMeta) => void;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  error?: string | null;
  extraBeforeSave?: ReactNode;
  secondaryAction?: ReactNode;
};

/**
 * Shared editor for manual entry, photo review and editing saved meals.
 * Totals are recomputed on every change from per-100 g values × grams.
 */
export function MealEditor({ items, onItemsChange, meta, onMetaChange, onSave, saving, saveLabel, error, extraBeforeSave, secondaryAction }: Props) {
  const t = useT();
  const [searchFor, setSearchFor] = useState<{ mode: 'add' } | { mode: 'replace'; key: string; query: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const totals = useMemo(() => sumNutrients(items.map(itemNutrients)), [items]);
  const invalid = items.length === 0 || items.some((i) => !i.name.trim() || !(parseDecimal(i.grams)! > 0) || parseDecimal(i.grams)! > 5000) || !meta.name.trim();

  const update = (key: string, patch: Partial<EditorItem>) => onItemsChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  function onPick(food: Food) {
    if (searchFor?.mode === 'replace') {
      const current = items.find((i) => i.key === searchFor.key);
      const replacement = itemFromFood(food, t.locale, current ? parseDecimal(current.grams) ?? undefined : undefined);
      onItemsChange(items.map((i) => (i.key === searchFor.key ? { ...replacement, key: i.key, scan: i.scan ? { ...i.scan, dbFood: null } : undefined } : i)));
    } else {
      onItemsChange([...items, itemFromFood(food, t.locale)]);
    }
    setSearchFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) {
      setShowErrors(true);
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    onSave();
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <Card className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label={t('meal.name')} error={showErrors && !meta.name.trim() ? t('common.errorValidation') : null} className="sm:col-span-2">
          {({ id, describedBy, invalid: inv }) => (
            <Input id={id} aria-describedby={describedBy} aria-invalid={inv} value={meta.name} maxLength={120} onChange={(e) => onMetaChange({ ...meta, name: e.target.value })} />
          )}
        </Field>
        <Field label={t('meal.category')}>
          {({ id }) => (
            <Select id={id} value={meta.category} onChange={(e) => onMetaChange({ ...meta, category: e.target.value as MealMeta['category'] })}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((c) => (
                <option key={c} value={c}>
                  {t(`meal.${c}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('meal.date')}>{({ id }) => <Input id={id} type="date" value={meta.date} onChange={(e) => onMetaChange({ ...meta, date: e.target.value })} required />}</Field>
          <Field label={t('meal.time')}>{({ id }) => <Input id={id} type="time" value={meta.time} onChange={(e) => onMetaChange({ ...meta, time: e.target.value })} required />}</Field>
        </div>
      </Card>

      <section aria-label={t('diary.items')} className="space-y-3">
        {items.length === 0 && <Notice>{t('manualEntry.noItems')}</Notice>}
        {items.map((item) => (
          <ItemRow
            key={item.key}
            item={item}
            showErrors={showErrors}
            onChange={(patch) => update(item.key, patch)}
            onRemove={() => onItemsChange(items.filter((i) => i.key !== item.key))}
            onReplace={() => setSearchFor({ mode: 'replace', key: item.key, query: item.name })}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setSearchFor({ mode: 'add' })}>
            <Plus className="h-4 w-4" aria-hidden />
            {t('manualEntry.addItem')}
          </Button>
          {secondaryAction}
        </div>
      </section>

      <Card className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 p-4 lg:bottom-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-soft">{t('manualEntry.total')}</p>
            <p className="font-display text-2xl leading-tight font-semibold tabular">
              {t.num(Math.round(totals.kcal))} <span className="text-sm font-normal text-ink-soft">{t('common.kcal')}</span>
            </p>
            <p className="text-xs text-ink-soft tabular">
              {t('macros.protein')} {t.num(totals.protein_g, 1)} g · {t('macros.carbs')} {t.num(totals.carbs_g, 1)} g · {t('macros.fat')} {t.num(totals.fat_g, 1)} g
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {extraBeforeSave}
            <Button type="submit" size="lg" loading={saving}>
              {saving ? t('common.saving') : saveLabel}
            </Button>
          </div>
        </div>
        {error && (
          <Notice tone="error" className="mt-3">
            {error}
          </Notice>
        )}
        <p className="mt-2 text-xs text-ink-faint">{t('common.estimatesNote')}</p>
      </Card>

      <Dialog
        open={searchFor !== null}
        onClose={() => setSearchFor(null)}
        title={searchFor?.mode === 'replace' ? t('scan.replaceFood') : t('manualEntry.addItem')}
        closeLabel={t('common.close')}
      >
        {searchFor && <FoodSearch autoFocus onSelect={onPick} initialQuery={searchFor.mode === 'replace' ? searchFor.query : ''} />}
      </Dialog>
    </form>
  );
}

function ItemRow({
  item,
  onChange,
  onRemove,
  onReplace,
  showErrors,
}: {
  item: EditorItem;
  onChange: (p: Partial<EditorItem>) => void;
  onRemove: () => void;
  onReplace: () => void;
  showErrors: boolean;
}) {
  const t = useT();
  const n = itemNutrients(item);
  const grams = parseDecimal(item.grams);
  const gramsInvalid = showErrors && !(grams && grams > 0 && grams <= 5000);
  const step = (delta: number) => onChange({ grams: String(Math.max(1, Math.round((grams ?? 0) + delta))) });
  const scan = item.scan;
  const unitLabel = (u: string) => {
    const key = u.split(/[ ,(]/)[0];
    return ['g', 'ml', 'tbsp', 'tsp', 'cup', 'piece', 'clove', 'can', 'egg', 'handful', 'pinch'].includes(key) ? t(`units.${key as 'cup'}`) : u;
  };

  return (
    <Card className={cn('p-4', scan?.identification_confidence === 'low' && 'border-wheat')}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <Field label={t('foodSearch.customName')} error={showErrors && !item.name.trim() ? t('common.errorValidation') : null}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={item.name} maxLength={200} onChange={(e) => onChange({ name: e.target.value })} />
            )}
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={`${t('manualEntry.portion')} (${t('manualEntry.grams')})`} error={gramsInvalid ? t('common.errorValidation') : null}>
              {({ id, describedBy, invalid }) => (
                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" size="icon" onClick={() => step(-10)} aria-label="−10 g">
                    <Minus className="h-4 w-4" aria-hidden />
                  </Button>
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    inputMode="decimal"
                    value={item.grams}
                    onChange={(e) => onChange({ grams: e.target.value })}
                    className="w-24 text-center tabular"
                  />
                  <Button variant="secondary" size="icon" onClick={() => step(10)} aria-label="+10 g">
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              )}
            </Field>
            {item.serving && (
              <div className="flex gap-1.5 pb-1">
                {[0.5, 1, 2].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ grams: String(Math.round(item.serving!.grams * m * 10) / 10) })}
                    className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-soft hover:border-rose hover:text-rose-ink"
                  >
                    {t.num(m, 1)} {unitLabel(item.serving!.unit)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {item.serving && <p className="text-xs text-ink-soft">{t('manualEntry.servingOf', { unit: unitLabel(item.serving.unit), grams: item.serving.grams })}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`${t('common.remove')} ${item.name}`}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-sm tabular text-ink">
          <span className="font-semibold">{n ? t.num(Math.round(n.kcal)) : '—'}</span> {t('common.kcal')}
          <span className="ms-3 text-ink-soft">
            P {n ? t.num(n.protein_g, 1) : '—'} · C {n ? t.num(n.carbs_g, 1) : '—'} · F {n ? t.num(n.fat_g, 1) : '—'}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {item.nutrient_source === 'ai_estimate' ? <Badge tone="wheat">{t('scan.aiEstimate')}</Badge> : item.nutrient_source === 'database' ? <Badge tone="leaf">{t('scan.dbValues')}</Badge> : null}
          <Button variant="ghost" size="sm" onClick={onReplace}>
            <Search className="h-3.5 w-3.5" aria-hidden />
            {t('scan.replaceFood')}
          </Button>
        </div>
      </div>

      {scan && (
        <div className="mt-3 space-y-2">
          {scan.dbFood && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
              <span>{t('scan.matched', { source: scan.dbFood.source === 'usda' ? 'USDA' : t('foodSearch.starterBadge'), food: scan.dbFood.name })}</span>
              {item.nutrient_source === 'database' ? (
                <button type="button" className="font-medium text-rose-ink underline underline-offset-2" onClick={() => onChange({ nutrient_source: 'ai_estimate', per100: scan.aiPer100, food_id: null })}>
                  {t('scan.useAiEstimate')}
                </button>
              ) : (
                <button
                  type="button"
                  className="font-medium text-rose-ink underline underline-offset-2"
                  onClick={() => onChange({ nutrient_source: 'database', per100: scan.dbFood!.per100, food_id: scan.dbFood!.id })}
                >
                  {t('scan.useDatabase')}
                </button>
              )}
            </div>
          )}
          {scan.identification_confidence === 'low' && <Notice tone="warn" icon={<TriangleAlert className="h-4 w-4" />}>{t('scan.lowConfidenceWarning')}</Notice>}
          {scan.portion_confidence === 'low' && scan.identification_confidence !== 'low' && (
            <Notice tone="warn" icon={<Droplet className="h-4 w-4" />}>
              {t('scan.portionWarning')}
            </Notice>
          )}
          {scan.energy_mismatch && item.nutrient_source === 'ai_estimate' && <Notice tone="warn">{t('scan.energyMismatch')}</Notice>}
          {scan.notes && <p className="text-xs text-ink-soft">{scan.notes}</p>}
          <p className="text-xs text-ink-faint">
            {t('scan.confidence', { level: t(`scan.confidence_${scan.identification_confidence}`) })}
          </p>
        </div>
      )}
    </Card>
  );
}
