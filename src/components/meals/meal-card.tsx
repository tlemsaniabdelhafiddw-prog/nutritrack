import Image from 'next/image';
import Link from 'next/link';
import { Camera, ChefHat, PenLine } from 'lucide-react';
import type { DiaryMeal } from '@/lib/server/diary';
import type { Translator } from '@/i18n/translate';
import { MacroDots } from '../ui/rings';
import { localTimeFor } from '@/lib/dates';

export function MealCard({ meal, t, timeZone, href }: { meal: DiaryMeal; t: Translator; timeZone: string; href?: string }) {
  const SourceIcon = meal.source === 'scan' ? Camera : meal.source === 'recipe' ? ChefHat : PenLine;
  const sourceLabel = meal.source === 'scan' ? t('diary.fromScan') : meal.source === 'recipe' ? t('diary.fromRecipe') : t('diary.manual');
  const content = (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 transition-colors hover:border-rose/60">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-blush-deep">
        {meal.photoUrl ? (
          <Image src={meal.photoUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />
        ) : (
          <span className="grid h-full w-full place-items-center text-rose" aria-hidden>
            <SourceIcon className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{meal.name}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
          <span className="tabular ltr-nums">{localTimeFor(new Date(meal.eaten_at), timeZone)}</span>
          <span aria-hidden>·</span>
          <span className="sr-only">{sourceLabel}</span>
          <SourceIcon className="h-3.5 w-3.5" aria-hidden />
        </p>
        <div className="mt-1">
          <MacroDots p={meal.totals.protein_g} c={meal.totals.carbs_g} f={meal.totals.fat_g} labels={{ protein: t('macros.protein'), carbs: t('macros.carbs'), fat: t('macros.fat') }} />
        </div>
      </div>
      <div className="text-end">
        <p className="font-display text-lg leading-none font-semibold tabular text-ink">{t.num(Math.round(meal.totals.kcal))}</p>
        <p className="text-xs text-ink-soft">{t('common.kcal')}</p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl">
      {content}
    </Link>
  ) : (
    content
  );
}
