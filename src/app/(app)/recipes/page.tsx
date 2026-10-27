import Link from 'next/link';
import { Search, UtensilsCrossed } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { listRecipes } from '@/lib/server/recipes';
import { getT } from '@/i18n/server';
import { ALLERGENS } from '@/lib/validation';
import { EmptyState, PageHeader } from '@/components/ui/surface';
import { fieldClasses } from '@/components/ui/field';
import { buttonClasses } from '@/components/ui/button';
import { RecipeCard } from '@/components/recipes/recipe-card';

export const metadata = { title: 'Recipes' };

type SP = { q?: string; meal?: string; time?: string; kcal?: string; protein?: string; diet?: string; exclude?: string | string[]; mine?: string; fav?: string };

const DIETS = ['vegetarian', 'vegan', 'pescatarian', 'gluten_free', 'dairy_free', 'high_protein', 'high_fiber'] as const;

export default async function RecipesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, user } = await getCurrentUser();
  const t = await getT();
  const sp = await searchParams;
  const asList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(',') : []);

  let exclude = asList(sp.exclude).filter((a) => (ALLERGENS as readonly string[]).includes(a));
  if (sp.mine === '1' && user) {
    const { data } = await supabase.from('user_preferences').select('allergies').eq('user_id', user.id).maybeSingle();
    exclude = [...new Set([...exclude, ...(data?.allergies ?? [])])];
  }
  const num = (v?: string) => (v && Number(v) > 0 ? Number(v) : undefined);
  const { recipes, favorites } = await listRecipes(
    supabase,
    {
      q: sp.q?.slice(0, 80),
      meal: ['breakfast', 'lunch', 'dinner', 'snack'].includes(sp.meal ?? '') ? sp.meal : undefined,
      diet: (DIETS as readonly string[]).includes(sp.diet ?? '') ? sp.diet : undefined,
      maxMinutes: num(sp.time),
      maxKcal: num(sp.kcal),
      minProtein: num(sp.protein),
      exclude,
      favoritesOnly: sp.fav === '1' && Boolean(user),
    },
    user?.id ?? null,
  );

  const select = (name: keyof SP, label: string, options: [string, string][]) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <select name={name} defaultValue={(sp[name] as string) ?? ''} className={fieldClasses}>
        <option value="">{t('recipes.any')}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <PageHeader title={t('recipes.title')} lead={t('recipes.lead')} />

      {/* Plain GET form: filters work without JavaScript and are shareable as links. */}
      <form method="get" action="/recipes" className="mb-8 space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-soft sm:p-5">
        <div className="relative">
          <label htmlFor="recipe-q" className="sr-only">
            {t('recipes.searchLabel')}
          </label>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input id="recipe-q" name="q" defaultValue={sp.q ?? ''} placeholder={t('recipes.searchPlaceholder')} className={`${fieldClasses} ps-10`} />
        </div>
        <details className="group" open={Boolean(sp.meal || sp.time || sp.kcal || sp.protein || sp.diet || exclude.length || sp.fav)}>
          <summary className="cursor-pointer text-sm font-medium text-rose-ink">{t('recipes.filters')}</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {select('meal', t('recipes.mealType'), (['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => [m, t(`meal.${m}`)]))}
            {select('time', t('recipes.maxTime'), [
              ['15', t('recipes.under15')],
              ['30', t('recipes.under30')],
              ['60', t('recipes.under60')],
            ])}
            {select('kcal', t('recipes.maxKcal'), [
              ['300', t('recipes.under300')],
              ['500', t('recipes.under500')],
              ['700', t('recipes.under700')],
            ])}
            {select('protein', t('recipes.minProtein'), [
              ['20', t('recipes.protein20')],
              ['30', t('recipes.protein30')],
            ])}
            {select('diet', t('recipes.diet'), DIETS.map((d) => [d, t(`diet.${d}`)]))}
          </div>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-ink">{t('recipes.excludeAllergens')}</legend>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => (
                <label key={a} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-paper px-3 py-1.5 text-sm has-[:checked]:border-leaf-ink has-[:checked]:bg-leaf-soft has-[:checked]:text-leaf-ink">
                  <input type="checkbox" name="exclude" value={a} defaultChecked={exclude.includes(a)} className="sr-only" />
                  {t(`allergen.${a}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {user && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === '1'} className="h-4 w-4 accent-[var(--color-rose-strong)]" />
                {t('recipes.useMyAllergies')}
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="fav" value="1" defaultChecked={sp.fav === '1'} className="h-4 w-4 accent-[var(--color-rose-strong)]" />
                {t('recipes.favoritesOnly')}
              </label>
            </div>
          )}
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={buttonClasses('primary', 'md')}>
            {t('common.search')}
          </button>
          <Link href="/recipes" className="text-sm text-ink-soft hover:text-ink">
            {t('recipes.clearFilters')}
          </Link>
          <span className="ms-auto text-sm text-ink-soft" aria-live="polite">
            {t('recipes.results', { count: recipes.length })}
          </span>
        </div>
      </form>

      {recipes.length === 0 ? (
        <EmptyState icon={<UtensilsCrossed className="h-8 w-8" />} title={t('recipes.empty')} action={<Link href="/recipes" className={buttonClasses('secondary', 'sm')}>{t('recipes.clearFilters')}</Link>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} t={t} favorite={favorites.has(r.id)} signedIn={Boolean(user)} />
          ))}
        </div>
      )}
      <p className="mt-8 text-xs text-ink-soft">{t('recipes.nutritionNote')}</p>
    </div>
  );
}
