'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, errorMessage } from '@/lib/client/api';
import { useToast } from '../ui/toast';
import { cn } from '@/lib/cn';

export function FavoriteButton({ recipeId, initial, signedIn, variant = 'icon' }: { recipeId: string; initial: boolean; signedIn: boolean; variant?: 'icon' | 'full' }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push(`/auth?next=/recipes/${recipeId}`);
      return;
    }
    const next = !fav;
    setFav(next);
    setBusy(true);
    try {
      await api(`/api/recipes/${recipeId}/favorite`, { method: next ? 'POST' : 'DELETE' });
      toast({ tone: 'success', message: next ? t('recipes.favorited') : t('recipes.unfavorited') });
      router.refresh();
    } catch (err) {
      setFav(!next);
      toast({ tone: 'error', message: errorMessage(t, err) });
    } finally {
      setBusy(false);
    }
  }

  const label = fav ? t('recipes.unfavorite') : t('recipes.favorite');
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={fav}
      aria-label={variant === 'icon' ? label : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-full transition-colors disabled:opacity-60',
        variant === 'icon' ? 'bg-paper/90 p-2 shadow-soft backdrop-blur hover:bg-paper' : 'border border-line-strong bg-paper px-4 py-2 text-sm font-medium hover:border-rose',
        fav ? 'text-rose-strong' : 'text-ink-soft',
      )}
    >
      <Heart className="h-4.5 w-4.5" fill={fav ? 'currentColor' : 'none'} aria-hidden />
      {variant === 'full' && label}
    </button>
  );
}
