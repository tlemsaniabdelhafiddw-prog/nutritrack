'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, CheckCheck, ListChecks, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, errorMessage } from '@/lib/client/api';
import { addDays } from '@/lib/dates';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Select, parseDecimal } from '../ui/field';
import { Card, EmptyState, Notice } from '../ui/surface';
import { useToast } from '../ui/toast';
import { cn } from '@/lib/cn';

type Category = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const CATEGORIES: Category[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type PlannedRow = {
  id: string;
  plan_date: string;
  category: Category;
  servings: number;
  logged_meal_id: string | null;
  recipe: { id: string; slug: string; title: string; kcal_per_serving: number };
};
export type RecipeOption = { id: string; title: string; kcal_per_serving: number; meal_types: string[] };
export type ShoppingItem = { id: string; name: string; quantity: number | null; unit: string | null; grams: number | null; checked: boolean };

const UNIT_KEYS = ['g', 'ml', 'tbsp', 'tsp', 'cup', 'piece', 'clove', 'can', 'egg', 'handful', 'pinch'] as const;

export function PlannerBoard({
  week,
  planned,
  recipes,
  shopping,
  today,
  nowTime,
}: {
  week: string;
  planned: PlannedRow[];
  recipes: RecipeOption[];
  shopping: ShoppingItem[];
  today: string;
  nowTime: string;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
  const [adding, setAdding] = useState<{ date: string; category: Category } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [items, setItems] = useState(shopping);
  const [generating, setGenerating] = useState(false);

  async function run(id: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(id);
    try {
      await fn();
      if (success) toast({ tone: 'success', message: success });
      router.refresh();
    } catch (err) {
      toast({ tone: 'error', message: errorMessage(t, err) });
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    if (items.some((i) => i.checked) && !window.confirm(t('planner.regenerateConfirm'))) return;
    setGenerating(true);
    try {
      const res = await api<{ items: ShoppingItem[] }>('/api/shopping', { json: { week } });
      setItems(res.items);
      toast({ tone: 'success', message: t('planner.listGenerated') });
    } catch (err) {
      toast({ tone: 'error', message: errorMessage(t, err) });
    } finally {
      setGenerating(false);
    }
  }

  async function toggleItem(item: ShoppingItem) {
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    try {
      await api(`/api/shopping/${item.id}`, { method: 'PATCH', json: { checked: !item.checked } });
    } catch (err) {
      setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)));
      toast({ tone: 'error', message: errorMessage(t, err) });
    }
  }

  const unit = (u: string | null) => (u && (UNIT_KEYS as readonly string[]).includes(u) ? t(`units.${u as (typeof UNIT_KEYS)[number]}`) : u ?? '');
  const left = items.filter((i) => !i.checked).length;

  return (
    <div className="space-y-10">
      {planned.length === 0 && <EmptyState title={t('planner.empty')} body={t('planner.lead')} />}

      <div className="space-y-4">
        {days.map((d) => {
          const dayItems = planned.filter((p) => p.plan_date === d);
          const kcal = dayItems.reduce((s, p) => s + p.recipe.kcal_per_serving * p.servings, 0);
          return (
            <Card key={d} className={cn('p-4', d === today && 'border-rose')}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">
                  {t.date(d, { weekday: 'long', day: 'numeric', month: 'short' })}
                  {d === today && <span className="ms-2 text-sm font-normal text-rose-ink">{t('common.today')}</span>}
                </h2>
                {kcal > 0 && <p className="text-sm text-ink-soft tabular">{t('planner.plannedKcal', { kcal: Math.round(kcal) })}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORIES.map((cat) => {
                  const slot = dayItems.filter((p) => p.category === cat);
                  return (
                    <div key={cat} className="rounded-2xl bg-blush/70 p-3">
                      <p className="mb-2 text-xs font-semibold text-ink-soft">{t(`meal.${cat}`)}</p>
                      <ul className="space-y-2">
                        {slot.map((p) => (
                          <li key={p.id} className="rounded-xl border border-line bg-paper p-2.5 text-sm">
                            <Link href={`/recipes/${p.recipe.slug}`} className="font-medium text-ink hover:text-rose-ink">
                              {p.recipe.title}
                            </Link>
                            <p className="text-xs text-ink-soft tabular">
                              {t.num(Math.round(p.recipe.kcal_per_serving * p.servings))} {t('common.kcal')}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-1.5">
                              <label className="text-xs">
                                <span className="sr-only">{t('planner.servings')}</span>
                                <select
                                  className="w-full rounded-lg border border-line-strong bg-paper px-1.5 py-1"
                                  value={String(p.servings)}
                                  disabled={busy === p.id}
                                  onChange={(e) => run(p.id, () => api(`/api/planner/${p.id}`, { method: 'PATCH', json: { servings: Number(e.target.value) } }))}
                                >
                                  {['0.5', '1', '1.5', '2', '3', '4'].map((v) => (
                                    <option key={v} value={v}>
                                      {t.num(Number(v), 1)} ×
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-xs">
                                <span className="sr-only">{t('planner.moveTo')}</span>
                                <select
                                  className="w-full rounded-lg border border-line-strong bg-paper px-1.5 py-1"
                                  value={p.plan_date}
                                  disabled={busy === p.id}
                                  onChange={(e) => run(p.id, () => api(`/api/planner/${p.id}`, { method: 'PATCH', json: { plan_date: e.target.value } }))}
                                >
                                  {days.map((dd) => (
                                    <option key={dd} value={dd}>
                                      {t.date(dd, { weekday: 'short' })}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-1">
                              {p.logged_meal_id ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-leaf-ink">
                                  <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                                  {t('planner.loggedEaten')}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy === p.id || p.plan_date > today}
                                  onClick={() => run(p.id, () => api(`/api/planner/${p.id}/log`, { json: { time: p.plan_date === today ? nowTime : '12:00' } }), t('recipes.logged'))}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-ink hover:underline disabled:text-ink-faint disabled:no-underline"
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden />
                                  {t('planner.logEaten')}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busy === p.id}
                                onClick={() => run(p.id, () => api(`/api/planner/${p.id}`, { method: 'DELETE' }), t('planner.removed'))}
                                className="rounded-full p-1 text-ink-faint hover:text-danger"
                                aria-label={`${t('planner.remove')}: ${p.recipe.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setAdding({ date: d, category: cat })}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong py-1.5 text-xs text-ink-soft hover:border-rose hover:text-rose-ink"
                        aria-label={`${t('planner.addRecipe')} — ${t(`meal.${cat}`)}, ${t.date(d, { weekday: 'long' })}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        {t('planner.addRecipe')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <section aria-labelledby="shopping">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="shopping" className="flex items-center gap-2 font-display text-xl font-semibold">
            <ListChecks className="h-5 w-5 text-leaf-ink" aria-hidden />
            {t('planner.shoppingList')}
          </h2>
          <Button variant="secondary" onClick={generate} loading={generating} disabled={planned.length === 0}>
            {items.length ? t('planner.regenerateList') : t('planner.generateList')}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('planner.listEmpty')}</p>
        ) : (
          <Card className="p-2">
            <p className="px-3 pt-2 text-sm text-ink-soft">{t('planner.itemsLeft', { count: left })}</p>
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                    <input type="checkbox" checked={i.checked} onChange={() => toggleItem(i)} className="h-4.5 w-4.5 accent-[var(--color-leaf-ink)]" />
                    <span className={cn('flex-1', i.checked && 'text-ink-faint line-through')}>{i.name}</span>
                    <span className="text-sm tabular text-ink-soft">
                      {i.quantity !== null ? `${t.num(i.quantity, 2)} ${unit(i.unit)}` : ''}
                      {i.grams ? <span className="ms-1 text-ink-faint">({t.num(i.grams)} g)</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {adding && <AddRecipeDialog slot={adding} recipes={recipes} onClose={() => setAdding(null)} onAdded={() => router.refresh()} />}
    </div>
  );
}

function AddRecipeDialog({ slot, recipes, onClose, onAdded }: { slot: { date: string; category: Category }; recipes: RecipeOption[]; onClose: () => void; onAdded: () => void }) {
  const t = useT();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [servings, setServings] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = recipes
    .filter((r) => r.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.meal_types.includes(slot.category)) - Number(a.meal_types.includes(slot.category)));

  async function submit() {
    const s = parseDecimal(servings);
    if (!recipeId || !s || s <= 0 || s > 24) {
      setError(t('common.errorValidation'));
      return;
    }
    setBusy(true);
    try {
      await api('/api/planner', { json: { plan_date: slot.date, category: slot.category, recipe_id: recipeId, servings: s } });
      toast({ tone: 'success', message: t('recipes.planned') });
      onAdded();
      onClose();
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('planner.chooseRecipe')}
      description={`${t(`meal.${slot.category}`)} · ${t.date(slot.date, { weekday: 'long', day: 'numeric', month: 'short' })}`}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} loading={busy} disabled={!recipeId}>
            {t('common.add')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('recipes.searchLabel')}>{({ id }) => <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />}</Field>
        <fieldset>
          <legend className="sr-only">{t('planner.chooseRecipe')}</legend>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filtered.map((r) => (
              <label key={r.id} className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2', recipeId === r.id ? 'bg-rose-soft/60' : 'hover:bg-blush-deep')}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="recipe" value={r.id} checked={recipeId === r.id} onChange={() => setRecipeId(r.id)} className="accent-[var(--color-rose-strong)]" />
                  <span className="text-sm">{r.title}</span>
                </span>
                <span className="text-xs text-ink-soft tabular">
                  {t.num(Math.round(r.kcal_per_serving))} {t('common.kcal')}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t('planner.servings')}>
          {({ id }) => (
            <Select id={id} value={servings} onChange={(e) => setServings(e.target.value)}>
              {['0.5', '1', '1.5', '2', '3', '4'].map((v) => (
                <option key={v} value={v}>
                  {t.num(Number(v), 1)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Dialog>
  );
}
