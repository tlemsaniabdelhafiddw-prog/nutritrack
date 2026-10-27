'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GlassWater } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, errorMessage } from '@/lib/client/api';
import { useToast } from '../ui/toast';
import { cn } from '@/lib/cn';

export function WaterTracker({ date, totalMl, goalMl }: { date: string; totalMl: number; goalMl: number }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState(0);
  const [, startTransition] = useTransition();
  const shown = totalMl + optimistic;
  const glasses = Math.max(8, Math.ceil(goalMl / 250));
  const filled = Math.min(glasses, Math.floor(shown / 250));

  async function add(amount: number) {
    setBusy(true);
    setOptimistic((o) => o + amount);
    try {
      const { entry } = await api<{ entry: { id: string } }>('/api/water', { json: { date, amount_ml: amount } });
      toast({
        tone: 'success',
        message: t('dashboard.waterAdded'),
        action: {
          label: t('dashboard.undo'),
          onClick: async () => {
            await api(`/api/water/${entry.id}`, { method: 'DELETE' }).catch(() => undefined);
            startTransition(() => router.refresh());
          },
        },
      });
      startTransition(() => {
        router.refresh();
        setOptimistic(0);
      });
    } catch (err) {
      setOptimistic((o) => o - amount);
      toast({ tone: 'error', message: errorMessage(t, err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-ink">{t('dashboard.water')}</h3>
        <p className="text-sm text-ink-soft tabular">{t('dashboard.waterOf', { amount: shown, goal: goalMl })}</p>
      </div>
      <div className="my-3 flex flex-wrap gap-1.5" aria-hidden>
        {Array.from({ length: glasses }, (_, i) => (
          <span key={i} className={cn('h-6 w-4 rounded-b-md rounded-t-sm border transition-colors', i < filled ? 'border-leaf bg-leaf/60' : 'border-line-strong bg-blush')} />
        ))}
      </div>
      <div className="flex gap-2">
        {[250, 500].map((ml) => (
          <button
            key={ml}
            type="button"
            disabled={busy}
            onClick={() => add(ml)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink hover:border-leaf hover:text-leaf-ink disabled:opacity-50"
          >
            <GlassWater className="h-4 w-4" aria-hidden />
            {t('dashboard.addWater', { amount: ml })}
          </button>
        ))}
      </div>
    </div>
  );
}
