import Image from 'next/image';
import Link from 'next/link';
import { Clock3, UtensilsCrossed } from 'lucide-react';
import type { Recipe } from '@/lib/server/recipes';
import { localized } from '@/lib/localized';
import type { Translator } from '@/i18n/translate';
import { FavoriteButton } from './favorite-button';

export function RecipeCard({ recipe, t, favorite, signedIn }: { recipe: Recipe; t: Translator; favorite: boolean; signedIn: boolean }) {
  const title = localized(recipe, 'title', t.locale);
  const minutes = recipe.prep_minutes + recipe.cook_minutes;
  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper shadow-soft transition-shadow hover:shadow-lift">
      <Link href={`/recipes/${recipe.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-blush-deep">
          {recipe.image_url ? (
            <Image src={recipe.image_url} alt="" fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 100vw" className="object-cover" />
          ) : (
            <span className="grid h-full place-items-center text-rose" aria-hidden>
              <UtensilsCrossed className="h-8 w-8" />
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-[1.05rem] leading-snug font-semibold text-ink">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {t('recipes.minutes', { min: minutes })}
            </span>
            <span className="tabular">
              <span className="font-semibold text-ink">{t.num(Math.round(Number(recipe.kcal_per_serving)))}</span> {t('common.kcal')} {t('recipes.perServing')}
            </span>
            <span className="tabular">
              {t('macros.protein')} {t.num(Math.round(Number(recipe.protein_per_serving)))} g
            </span>
          </div>
        </div>
      </Link>
      <div className="absolute end-3 top-3">
        <FavoriteButton recipeId={recipe.id} initial={favorite} signedIn={signedIn} />
      </div>
    </article>
  );
}
