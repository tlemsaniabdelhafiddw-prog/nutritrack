'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, errorMessage } from '@/lib/client/api';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';
import { MealFormDialog } from './meal-form-dialog';
import type { MealMeta } from './meal-editor';

/** Opens the add/edit sheets from URL state so dashboard links can deep-link into them. */
export function DiaryControls({
  date,
  nowTime,
  openAdd,
  openMealId,
  initialCategory,
}: {
  date: string;
  nowTime: string;
  openAdd: boolean;
  openMealId: string | null;
  initialCategory: MealMeta['category'];
}) {
  const t = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(openAdd);
  const [editing, setEditing] = useState<string | null>(openMealId);

  const closeAndClean = () => {
    setAdding(false);
    setEditing(null);
    router.replace(`/diary?date=${date}`, { scroll: false });
  };

  return (
    <>
      <Button onClick={() => setAdding(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {t('diary.addFood')}
      </Button>
      {adding && <MealFormDialog open mode="create" onClose={closeAndClean} defaults={{ date, time: nowTime, category: initialCategory }} />}
      {editing && <MealFormDialog open mode="edit" mealId={editing} onClose={closeAndClean} defaults={{ date, time: nowTime, category: initialCategory }} />}
    </>
  );
}

export function MealActions({ mealId, hasPhoto, editTime }: { mealId: string; hasPhoto: boolean; editTime: string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<'delete' | 'photo' | null>(null);
  const [editing, setEditing] = useState(false);

  async function remove() {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setBusy('delete');
    try {
      await api(`/api/meals/${mealId}`, { method: 'DELETE' });
      toast({ tone: 'success', message: t('diary.mealDeleted') });
      router.refresh();
    } catch (err) {
      toast({ tone: 'error', message: errorMessage(t, err) });
    } finally {
      setBusy(null);
    }
  }

  async function removePhoto() {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setBusy('photo');
    try {
      await api(`/api/meals/${mealId}/photo`, { method: 'DELETE' });
      toast({ tone: 'success', message: t('diary.photoDeleted') });
      router.refresh();
    } catch (err) {
      toast({ tone: 'error', message: errorMessage(t, err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {t('common.edit')}
      </Button>
      {hasPhoto && (
        <Button variant="ghost" size="sm" onClick={removePhoto} loading={busy === 'photo'}>
          <ImageOff className="h-3.5 w-3.5" aria-hidden />
          {t('diary.deletePhoto')}
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={remove} loading={busy === 'delete'} className="text-danger hover:text-danger">
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {t('common.delete')}
      </Button>
      {editing && (
        <MealFormDialog
          open
          mode="edit"
          mealId={mealId}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
          defaults={{ date: '', time: editTime, category: 'lunch' }}
        />
      )}
    </div>
  );
}
