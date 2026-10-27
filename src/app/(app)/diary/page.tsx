import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { requireAppUser } from '@/lib/server/profile';
import { getDay } from '@/lib/server/diary';
import { isLocalDate, localDateFor, localTimeFor } from '@/lib/dates';
import { getT } from '@/i18n/server';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/surface';
import { DayNav } from '@/components/dashboard/day-nav';
import { DiaryControls, MealActions } from '@/components/meals/diary-client';
import { MacroDots } from '@/components/ui/rings';
import { uuid } from '@/lib/validation';

export const metadata = { title: 'Diary' };

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type Category = (typeof CATEGORIES)[number];

export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ date?: string; add?: string; meal?: string; category?: string }> }) {
  const app = await requireAppUser();
  const t = await getT();
  const sp = await searchParams;
  const today = localDateFor(new Date(), app.timeZone);
  const date = sp.date && isLocalDate(sp.date) && sp.date <= today ? sp.date : today;
  const day = await getDay(app.supabase, app.user.id, date);
  const nowTime = localTimeFor(new Date(), app.timeZone);
  const hour = Number(nowTime.slice(0, 2));
  const defaultCategory: Category = (CATEGORIES as readonly string[]).includes(sp.category ?? '')
    ? (sp.category as Category)
    : hour < 11
      ? 'breakfast'
      : hour < 16
        ? 'lunch'
        : hour < 21
          ? 'dinner'
          : 'snack';
  const openMealId = sp.meal && uuid.safeParse(sp.meal).success ? sp.meal : null;

  return (
    <div>
      <PageHeader
        title={t('diary.title')}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <DayNav date={date} today={today} basePath="/diary" t={t} />
            <DiaryControls date={date} nowTime={date === today ? nowTime : '12:00'} openAdd={sp.add === '1'} openMealId={openMealId} initialCategory={defaultCategory} />
          </div>
        }
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-ink-soft">{t('diary.dayTotal')}</p>
          <p className="font-display text-3xl font-semibold tabular">
            {t.num(Math.round(day.totals.kcal))} <span className="text-base font-normal text-ink-soft">{t('common.kcal')}</span>
            {app.targets && <span className="ms-2 text-base font-normal text-ink-soft">{t('dashboard.ofTarget', { target: app.targets.calories })}</span>}
          </p>
        </div>
        <dl className="grid grid-cols-4 gap-4 text-center text-sm">
          {(
            [
              ['macros.protein', day.totals.protein_g],
              ['macros.carbs', day.totals.carbs_g],
              ['macros.fat', day.totals.fat_g],
              ['macros.fiber', day.totals.fiber_g],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-soft">{t(k)}</dt>
              <dd className="font-semibold tabular">{t.num(v, 0)} g</dd>
            </div>
          ))}
        </dl>
      </Card>

      {day.meals.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title={t('diary.empty')} body={t('diary.emptyHint')} />
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const meals = day.meals.filter((m) => m.category === cat);
            if (!meals.length) return null;
            return (
              <section key={cat} aria-labelledby={`cat-${cat}`}>
                <h2 id={`cat-${cat}`} className="mb-3 font-display text-lg font-semibold">
                  {t(`meal.${cat}`)}{' '}
                  <span className="text-sm font-normal text-ink-soft tabular">
                    · {t.num(Math.round(meals.reduce((s, m) => s + m.totals.kcal, 0)))} {t('common.kcal')}
                  </span>
                </h2>
                <div className="space-y-3">
                  {meals.map((m) => (
                    <Card key={m.id} className="overflow-hidden">
                      <div className="flex gap-4 p-4">
                        {m.photoUrl && (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                            <Image src={m.photoUrl} alt="" fill sizes="80px" className="object-cover" unoptimized />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium text-ink">{m.name}</h3>
                              <p className="text-xs text-ink-soft">
                                <span className="tabular ltr-nums">{localTimeFor(new Date(m.eaten_at), app.timeZone)}</span> ·{' '}
                                {m.source === 'scan' ? t('diary.fromScan') : m.source === 'recipe' ? t('diary.fromRecipe') : t('diary.manual')}
                                {m.recipe_servings ? ` · ${t('diary.servingsEaten', { servings: Number(m.recipe_servings) })}` : ''}
                              </p>
                            </div>
                            <p className="font-display text-xl font-semibold tabular">
                              {t.num(Math.round(m.totals.kcal))} <span className="text-xs font-normal text-ink-soft">{t('common.kcal')}</span>
                            </p>
                          </div>
                          <div className="mt-1">
                            <MacroDots p={m.totals.protein_g} c={m.totals.carbs_g} f={m.totals.fat_g} labels={{ protein: t('macros.protein'), carbs: t('macros.carbs'), fat: t('macros.fat') }} />
                          </div>
                        </div>
                      </div>
                      <details className="group border-t border-line">
                        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-ink-soft hover:text-ink">
                          {t('diary.items')} ({m.items.length})
                        </summary>
                        <ul className="divide-y divide-line px-4 pb-2">
                          {m.items.map((i) => (
                            <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                              <span className="min-w-0">
                                <span className="block truncate text-ink">{i.name}</span>
                                <span className="text-xs text-ink-soft tabular">{t.num(Number(i.grams))} g</span>
                              </span>
                              <span className="flex items-center gap-2">
                                {i.nutrient_source === 'ai_estimate' && <Badge tone="wheat">{t('common.estimate')}</Badge>}
                                <span className="tabular text-ink-soft">
                                  {t.num(Math.round(Number(i.kcal)))} {t('common.kcal')}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                      <div className="border-t border-line px-2 py-1.5">
                        <MealActions mealId={m.id} hasPhoto={Boolean(m.photo_path)} editTime={localTimeFor(new Date(m.eaten_at), app.timeZone)} />
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-8 text-xs text-ink-soft">{t('common.estimatesNote')}</p>
    </div>
  );
}
