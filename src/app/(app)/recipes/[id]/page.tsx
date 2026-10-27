import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, Flame, TriangleAlert, Users } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { getRecipe } from '@/lib/server/recipes';
import { localized } from '@/lib/localized';
import { getT } from '@/i18n/server';
import { localDateFor, localTimeFor, safeTimeZone } from '@/lib/dates';
import { Badge, Card, Notice } from '@/components/ui/surface';
import { MacroBar } from '@/components/ui/rings';
import { FavoriteButton } from '@/components/recipes/favorite-button';
import { RecipeActions } from '@/components/recipes/recipe-actions';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await getCurrentUser();
  const r = await getRecipe(supabase, (await params).id);
  return { title: r?.title ?? 'Recipe' };
}

const UNIT_KEYS = ['g', 'ml', 'tbsp', 'tsp', 'cup', 'piece', 'clove', 'can', 'egg', 'handful', 'pinch'] as const;

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getCurrentUser();
  const t = await getT();
  const recipe = await getRecipe(supabase, (await params).id);
  if (!recipe) notFound();

  let favorite = false;
  let allergies: string[] = [];
  let tz = 'UTC';
  if (user) {
    const [fav, pref, prof] = await Promise.all([
      supabase.from('favorite_recipes').select('recipe_id').eq('user_id', user.id).eq('recipe_id', recipe.id).maybeSingle(),
      supabase.from('user_preferences').select('allergies').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
    ]);
    favorite = Boolean(fav.data);
    allergies = pref.data?.allergies ?? [];
    tz = safeTimeZone(prof.data?.timezone);
  }
  const flagged = recipe.allergens.filter((a) => allergies.includes(a));
  const title = localized(recipe, 'title', t.locale);
  const now = new Date();
  const time = localTimeFor(now, tz);
  const hour = Number(time.slice(0, 2));
  const category = (recipe.meal_types.find((m) => ['breakfast', 'lunch', 'dinner', 'snack'].includes(m)) ?? (hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner')) as 'breakfast' | 'lunch' | 'dinner' | 'snack';
  const unit = (u: string) => ((UNIT_KEYS as readonly string[]).includes(u) ? t(`units.${u as (typeof UNIT_KEYS)[number]}`) : u);
  const n = (v: number) => Number(v);

  return (
    <article>
      <Link href="/recipes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {t('recipes.title')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-blush-deep shadow-soft">
            {recipe.image_url && <Image src={recipe.image_url} alt={title} fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />}
          </div>
          {recipe.image_credit && <p className="mt-2 text-xs text-ink-faint">{t('recipes.photoBy', { credit: recipe.image_credit })}</p>}
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {recipe.diet_tags.map((d) => (
              <Badge key={d} tone="leaf">
                {t(`diet.${d as 'vegan'}`)}
              </Badge>
            ))}
          </div>
          <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-tight sm:text-[2.4rem]">{title}</h1>
          <p className="mt-3 text-ink-soft">{localized(recipe, 'description', t.locale)}</p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
            <li className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              {t('recipes.servings', { count: recipe.servings })}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" aria-hidden />
              {t('recipes.prep', { min: recipe.prep_minutes })}
              {recipe.cook_minutes > 0 && ` · ${t('recipes.cook', { min: recipe.cook_minutes })}`}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4" aria-hidden />
              {t.num(Math.round(n(recipe.kcal_per_serving)))} {t('common.kcal')} {t('recipes.perServing')}
            </li>
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <RecipeActions
              recipeId={recipe.id}
              slug={recipe.slug}
              title={title}
              signedIn={Boolean(user)}
              perServing={{
                kcal_per_serving: n(recipe.kcal_per_serving),
                protein_per_serving: n(recipe.protein_per_serving),
                carbs_per_serving: n(recipe.carbs_per_serving),
                fat_per_serving: n(recipe.fat_per_serving),
                fiber_per_serving: n(recipe.fiber_per_serving),
              }}
              defaults={{ date: localDateFor(now, tz), time, category }}
            />
            <FavoriteButton recipeId={recipe.id} initial={favorite} signedIn={Boolean(user)} variant="full" />
          </div>

          {flagged.length > 0 && (
            <Notice tone="warn" icon={<TriangleAlert className="h-4 w-4" />} className="mt-5">
              {t('recipes.allergenWarning', { list: flagged.map((a) => t(`allergen.${a as 'milk'}`)).join(', ') })}
            </Notice>
          )}

          <Card className="mt-6 p-5">
            <h2 className="mb-4 font-medium">{t('recipes.nutritionPerServing')}</h2>
            <p className="mb-4 font-display text-3xl font-semibold tabular">
              {t.num(Math.round(n(recipe.kcal_per_serving)))} <span className="text-base font-normal text-ink-soft">{t('common.kcal')}</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <MacroBar kind="protein" label={t('macros.protein')} value={n(recipe.protein_per_serving)} target={null} unit="g" />
              <MacroBar kind="carbs" label={t('macros.carbs')} value={n(recipe.carbs_per_serving)} target={null} unit="g" />
              <MacroBar kind="fat" label={t('macros.fat')} value={n(recipe.fat_per_serving)} target={null} unit="g" />
              <MacroBar kind="fiber" label={t('macros.fiber')} value={n(recipe.fiber_per_serving)} target={null} unit="g" />
            </div>
            <p className="mt-4 text-xs text-ink-soft">{t('recipes.nutritionNote')}</p>
            <p className="mt-3 text-sm">
              <span className="font-medium">{t('recipes.allergens')}: </span>
              <span className="text-ink-soft">{recipe.allergens.length ? recipe.allergens.map((a) => t(`allergen.${a as 'milk'}`)).join(', ') : t('recipes.noAllergens')}</span>
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="ingredients">
          <h2 id="ingredients" className="mb-4 font-display text-xl font-semibold">
            {t('recipes.ingredients')}
          </h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper">
            {recipe.ingredients.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <span>{localized(i, 'name', t.locale)}</span>
                <span className="shrink-0 text-sm tabular text-ink-soft">
                  {t.num(n(i.quantity), 2)} {unit(i.unit)}
                  {i.unit !== 'g' && <span className="ms-1 text-ink-faint">({t.num(n(i.grams))} g)</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="method">
          <h2 id="method" className="mb-4 font-display text-xl font-semibold">
            {t('recipes.method')}
          </h2>
          <ol className="space-y-5">
            {recipe.instructions.map((s) => (
              <li key={s.id} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-soft font-display font-semibold text-rose-ink tabular" aria-hidden>
                  {s.step}
                </span>
                <p className="pt-1 leading-relaxed">{localized(s, 'body', t.locale)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
