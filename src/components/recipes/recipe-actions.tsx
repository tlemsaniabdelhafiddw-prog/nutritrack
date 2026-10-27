'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, NotebookPen } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, errorMessage, newRequestId } from '@/lib/client/api';
import { recipeServingNutrients } from '@/lib/nutrition/portions';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Select, parseDecimal } from '../ui/field';
import { Notice } from '../ui/surface';
import { useToast } from '../ui/toast';

type PerServing = { kcal_per_serving: number; protein_per_serving: number; carbs_per_serving: number; fat_per_serving: number; fiber_per_serving: number };
type Category = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function RecipeActions({
  recipeId,
  slug,
  title,
  perServing,
  signedIn,
  defaults,
}: {
  recipeId: string;
  slug: string;
  title: string;
  perServing: PerServing;
  signedIn: boolean;
  defaults: { date: string; time: string; category: Category };
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<'log' | 'plan' | null>(null);
  const [servings, setServings] = useState('1');
  const [category, setCategory] = useState<Category>(defaults.category);
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(newRequestId());

  const s = parseDecimal(servings);
  const valid = s !== null && s > 0 && s <= 24;
  const totals = valid ? recipeServingNutrients(perServing, s!) : null;

  function open(m: 'log' | 'plan') {
    if (!signedIn) {
      router.push(`/auth?next=/recipes/${slug}`);
      return;
    }
    setError(null);
    setMode(m);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError(t('common.errorValidation'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'log') {
        const res = await api<{ local_date: string }>(`/api/recipes/${recipeId}/log`, { json: { client_request_id: requestId.current, servings: s, category, date, time } });
        requestId.current = newRequestId();
        toast({ tone: 'success', message: t('recipes.logged') });
        setMode(null);
        router.push(`/dashboard?date=${res.local_date}`);
        router.refresh();
      } else {
        await api('/api/planner', { json: { plan_date: date, category, recipe_id: recipeId, servings: s } });
        toast({ tone: 'success', message: t('recipes.planned') });
        setMode(null);
      }
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={() => open('log')}>
          <NotebookPen className="h-5 w-5" aria-hidden />
          {t('recipes.logThis')}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => open('plan')}>
          <CalendarPlus className="h-5 w-5" aria-hidden />
          {t('recipes.addToPlan')}
        </Button>
      </div>
      {!signedIn && <p className="mt-2 text-sm text-ink-soft">{t('recipes.signInToLog')}</p>}

      <Dialog
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'log' ? t('recipes.logTitle', { title }) : t('recipes.addToPlan')}
        closeLabel={t('common.close')}
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label={mode === 'log' ? t('recipes.servingsEaten') : t('planner.servings')} error={!valid ? t('common.errorValidation') : null}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} inputMode="decimal" aria-describedby={describedBy} aria-invalid={invalid} className="tabular" value={servings} onChange={(e) => setServings(e.target.value)} />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            {['0.5', '1', '1.5', '2'].map((v) => (
              <button key={v} type="button" onClick={() => setServings(v)} className="rounded-full border border-line-strong px-3 py-1 text-sm hover:border-rose">
                {t.num(Number(v), 1)}
              </button>
            ))}
          </div>
          <Field label={t('meal.category')}>
            {({ id }) => (
              <Select id={id} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((c) => (
                  <option key={c} value={c}>
                    {t(`meal.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={mode === 'plan' ? t('recipes.planDay') : t('meal.date')}>{({ id }) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            {mode === 'log' && <Field label={t('meal.time')}>{({ id }) => <Input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>}
          </div>
          {totals && mode === 'log' && (
            <div className="rounded-2xl bg-blush-deep/70 px-4 py-3 text-sm">
              <p className="text-xs text-ink-soft">{t('recipes.logTotal')}</p>
              <p className="font-display text-xl font-semibold tabular">
                {t.num(Math.round(totals.kcal))} {t('common.kcal')}
              </p>
              <p className="tabular text-ink-soft">
                {t('macros.protein')} {t.num(totals.protein_g, 1)} g · {t('macros.carbs')} {t.num(totals.carbs_g, 1)} g · {t('macros.fat')} {t.num(totals.fat_g, 1)} g
              </p>
            </div>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={busy}>
              {mode === 'log' ? t('recipes.logThis') : t('recipes.addToPlan')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
