'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { api, errorMessage, newRequestId } from '@/lib/client/api';
import { parseDecimal } from '../ui/field';
import { Dialog } from '../ui/dialog';
import { Skeleton } from '../ui/surface';
import { useToast } from '../ui/toast';
import { MealEditor, newKey, type EditorItem, type MealMeta } from './meal-editor';
import type { Tables } from '@/lib/supabase/database.types';

type Category = MealMeta['category'];

export function autoName(items: EditorItem[], fallback: string) {
  const names = items.map((i) => i.name.trim()).filter(Boolean);
  if (!names.length) return fallback;
  return (names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')).slice(0, 120);
}

export function toPayloadItems(items: EditorItem[]) {
  return items.map((i) => ({
    name: i.name.trim(),
    grams: parseDecimal(i.grams)!,
    food_id: i.food_id,
    nutrient_source: i.nutrient_source,
    per100: i.per100,
  }));
}

/** Manual entry (mode "create") or editing a saved meal (mode "edit"), in a sheet. */
export function MealFormDialog({
  open,
  onClose,
  mode,
  mealId,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  mealId?: string;
  defaults: { date: string; time: string; category: Category };
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState<EditorItem[]>([]);
  const [meta, setMeta] = useState<MealMeta>({ name: '', category: defaults.category, date: defaults.date, time: defaults.time });
  const [nameTouched, setNameTouched] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(newRequestId());

  useEffect(() => {
    if (!open || mode !== 'edit' || !mealId) return;
    let cancelled = false;
    setLoading(true);
    api<Tables<'meals'> & { items: Tables<'meal_items'>[]; local_time?: string }>(`/api/meals/${mealId}`)
      .then((m) => {
        if (cancelled) return;
        setItems(
          m.items.map((i) => ({
            key: newKey(),
            name: i.name,
            grams: String(Number(i.grams)),
            food_id: i.food_id,
            nutrient_source: i.nutrient_source === 'recipe' ? (i.food_id ? 'database' : 'manual') : (i.nutrient_source as EditorItem['nutrient_source']),
            per100: {
              kcal_100g: Number(i.kcal_100g),
              protein_100g: Number(i.protein_100g),
              carbs_100g: Number(i.carbs_100g),
              fat_100g: Number(i.fat_100g),
              fiber_100g: i.fiber_100g === null ? null : Number(i.fiber_100g),
            },
            serving: null,
          })),
        );
        setMeta({ name: m.name, category: m.category as Category, date: m.local_date, time: m.local_time ?? defaults.time });
        setNameTouched(true);
      })
      .catch((err) => setError(errorMessage(t, err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, mode, mealId, t, defaults.time]);

  function changeItems(next: EditorItem[]) {
    setItems(next);
    if (!nameTouched) setMeta((m) => ({ ...m, name: autoName(next, t(`meal.${m.category}`)) }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        await api('/api/meals', {
          json: { client_request_id: requestId.current, ...meta, name: meta.name.trim(), source: 'manual', items: toPayloadItems(items) },
        });
      } else {
        await api(`/api/meals/${mealId}`, { method: 'PATCH', json: { ...meta, name: meta.name.trim(), items: toPayloadItems(items) } });
      }
      toast({ tone: 'success', message: mode === 'create' ? t('manualEntry.mealSaved') : t('common.saved') });
      requestId.current = newRequestId();
      onClose();
      router.replace(`/diary?date=${meta.date}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={mode === 'create' ? t('manualEntry.title') : t('diary.editMeal')} description={mode === 'create' ? t('manualEntry.lead') : undefined} closeLabel={t('common.close')}>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <MealEditor
          items={items}
          onItemsChange={changeItems}
          meta={meta}
          onMetaChange={(m) => {
            if (m.name !== meta.name) setNameTouched(true);
            setMeta(m.name === meta.name && !nameTouched ? { ...m, name: autoName(items, t(`meal.${m.category}`)) } : m);
          }}
          onSave={save}
          saving={saving}
          saveLabel={mode === 'create' ? t('manualEntry.saveMeal') : t('common.save')}
          error={error}
        />
      )}
    </Dialog>
  );
}
