'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Database, LoaderCircle, Plus, Search } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, errorMessage } from '@/lib/client/api';
import type { Tables } from '@/lib/supabase/database.types';
import { Badge, Notice } from '../ui/surface';
import { Button } from '../ui/button';
import { Field, Input, parseDecimal } from '../ui/field';
import { cn } from '@/lib/cn';
import type { Per100 } from '@/lib/nutrition/portions';

export type Food = Tables<'foods'>;
type UsdaFood = { fdcId: number; name: string; dataType: string; per100: Per100 };

export function foodName(f: Pick<Food, 'name' | 'name_fr' | 'name_ar'>, locale: string) {
  return (locale === 'fr' && f.name_fr) || (locale === 'ar' && f.name_ar) || f.name;
}

/** Accessible combobox for the food catalog, with optional USDA lookup and custom foods. */
export function FoodSearch({ onSelect, autoFocus, initialQuery = '' }: { onSelect: (food: Food) => void; autoFocus?: boolean; initialQuery?: string }) {
  const t = useT();
  const listId = useId();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [usda, setUsda] = useState<{ state: 'idle' | 'loading' | 'done' | 'unconfigured' | 'error'; foods: UsdaFood[] }>({ state: 'idle', foods: [] });
  const [importing, setImporting] = useState<number | null>(null);
  const [custom, setCustom] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setUsda({ state: 'idle', foods: [] });
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const { foods } = await api<{ foods: Food[] }>(`/api/foods/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        setResults(foods);
        setActive(0);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError(errorMessage(t, err));
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [q, t]);

  async function searchUsda() {
    setUsda({ state: 'loading', foods: [] });
    try {
      const r = await api<{ configured: boolean; foods: UsdaFood[] }>(`/api/foods/usda?q=${encodeURIComponent(q.trim())}`);
      setUsda({ state: r.configured ? 'done' : 'unconfigured', foods: r.foods });
    } catch {
      setUsda({ state: 'error', foods: [] });
    }
  }

  async function importUsda(f: UsdaFood) {
    setImporting(f.fdcId);
    try {
      const { food } = await api<{ food: Food }>('/api/foods/usda/import', { json: { fdcId: f.fdcId } });
      onSelect(food);
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setImporting(null);
    }
  }

  const sourceBadge = (f: Food) =>
    f.source === 'usda' ? <Badge tone="leaf">{t('foodSearch.usdaBadge')}</Badge> : f.source === 'user' ? <Badge tone="rose">{t('foodSearch.userBadge')}</Badge> : <Badge>{t('foodSearch.starterBadge')}</Badge>;

  if (custom) return <CustomFoodForm initialName={q} onCancel={() => setCustom(false)} onCreated={onSelect} />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t('foodSearch.label')}
        </label>
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <Input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={t('foodSearch.placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && results[active]) {
              e.preventDefault();
              onSelect(results[active]);
            }
          }}
          className="ps-10"
        />
        {loading && <LoaderCircle className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-faint" aria-hidden />}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <ul id={listId} role="listbox" aria-label={t('foodSearch.label')} className="max-h-72 space-y-1 overflow-y-auto">
        {results.map((f, i) => (
          <li
            key={f.id}
            id={`${listId}-${f.id}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => onSelect(f)}
            className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5', i === active ? 'bg-rose-soft/60' : 'hover:bg-blush-deep')}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{foodName(f, t.locale)}</p>
              <p className="text-xs text-ink-soft tabular">
                {t.num(Number(f.kcal_100g))} {t('common.kcal')} · P {t.num(Number(f.protein_100g), 1)} · C {t.num(Number(f.carbs_100g), 1)} · F {t.num(Number(f.fat_100g), 1)} {t('foodSearch.per100')}
              </p>
            </div>
            {sourceBadge(f)}
          </li>
        ))}
      </ul>

      {q.trim() && !loading && results.length === 0 && !error && <p className="px-1 text-sm text-ink-soft">{t('foodSearch.noResults', { query: q.trim() })}</p>}

      {q.trim().length >= 2 && (
        <div className="space-y-2 border-t border-line pt-3">
          {usda.state === 'idle' && (
            <Button variant="ghost" size="sm" onClick={searchUsda}>
              <Database className="h-4 w-4" aria-hidden />
              {t('foodSearch.searchUsda')}
            </Button>
          )}
          {usda.state === 'loading' && <p className="text-sm text-ink-soft">{t('common.loading')}</p>}
          {usda.state === 'unconfigured' && <p className="text-sm text-ink-soft">{t('foodSearch.usdaUnavailable')}</p>}
          {usda.state === 'error' && <p className="text-sm text-danger">{t('foodSearch.usdaError')}</p>}
          {usda.state === 'done' && (
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-soft">{t('foodSearch.usdaResults')}</p>
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {usda.foods.map((f) => (
                  <li key={f.fdcId}>
                    <button
                      type="button"
                      disabled={importing !== null}
                      onClick={() => importUsda(f)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start hover:bg-blush-deep disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{f.name}</span>
                        <span className="text-xs text-ink-soft tabular">
                          {t.num(f.per100.kcal_100g)} {t('common.kcal')} {t('foodSearch.per100')}
                        </span>
                      </span>
                      {importing === f.fdcId ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Badge tone="leaf">{t('foodSearch.usdaBadge')}</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setCustom(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          {t('foodSearch.createCustom')}
        </Button>
        <p className="text-xs text-ink-faint">{t('foodSearch.approximate')}</p>
      </div>
    </div>
  );
}

function CustomFoodForm({ initialName, onCancel, onCreated }: { initialName: string; onCancel: () => void; onCreated: (f: Food) => void }) {
  const t = useT();
  const [name, setName] = useState(initialName);
  const [vals, setVals] = useState({ kcal: '', protein: '', carbs: '', fat: '', fiber: '', serving: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof vals) => (e: React.ChangeEvent<HTMLInputElement>) => setVals((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const kcal = parseDecimal(vals.kcal);
    if (!name.trim() || kcal === null) {
      setError(t('common.errorValidation'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { food } = await api<{ food: Food }>('/api/foods/custom', {
        json: {
          name: name.trim(),
          serving_grams: parseDecimal(vals.serving),
          per100: {
            kcal_100g: kcal,
            protein_100g: parseDecimal(vals.protein) ?? 0,
            carbs_100g: parseDecimal(vals.carbs) ?? 0,
            fat_100g: parseDecimal(vals.fat) ?? 0,
            fiber_100g: parseDecimal(vals.fiber),
          },
        },
      });
      onCreated(food);
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  const num = (k: keyof typeof vals, label: string, optional?: boolean) => (
    <Field label={label} optional={optional ? t('common.optional') : undefined}>
      {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} inputMode="decimal" value={vals[k]} onChange={set(k)} className="tabular" />}
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="font-medium">{t('foodSearch.customTitle')}</h3>
      <Field label={t('foodSearch.customName')}>{({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />}</Field>
      <p className="text-sm text-ink-soft">{t('foodSearch.customPer100')}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {num('kcal', `${t('macros.calories')} (${t('common.kcal')})`)}
        {num('protein', `${t('macros.protein')} (g)`)}
        {num('carbs', `${t('macros.carbs')} (g)`)}
        {num('fat', `${t('macros.fat')} (g)`)}
        {num('fiber', `${t('macros.fiber')} (g)`, true)}
        {num('serving', t('foodSearch.customServing'), true)}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t('common.back')}
        </Button>
        <Button type="submit" loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
