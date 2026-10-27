import Link from 'next/link';
import { BookOpen, Camera, ChefHat, Plus } from 'lucide-react';
import { requireAppUser } from '@/lib/server/profile';
import { getDailyTotals, getDay, getInsightsFor, getWeights } from '@/lib/server/diary';
import { addDays, isLocalDate, localDateFor, localHourFor } from '@/lib/dates';
import { getT } from '@/i18n/server';
import { Card, SectionTitle } from '@/components/ui/surface';
import { MacroBar, PlateRing } from '@/components/ui/rings';
import { MealCard } from '@/components/meals/meal-card';
import { DayNav } from '@/components/dashboard/day-nav';
import { WaterTracker } from '@/components/dashboard/water-tracker';
import { WeekBars, WeightSpark } from '@/components/dashboard/mini-charts';
import { InsightList } from '@/components/dashboard/insights';
import { kgToLb } from '@/lib/nutrition/portions';
import type { MessageKey } from '@/i18n/translate';

export const metadata = { title: 'Home' };

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const app = await requireAppUser();
  const t = await getT();
  const today = localDateFor(new Date(), app.timeZone);
  const sp = await searchParams;
  const date = sp.date && isLocalDate(sp.date) && sp.date <= today ? sp.date : today;

  const [day, week, weights] = await Promise.all([
    getDay(app.supabase, app.user.id, date),
    getDailyTotals(app.supabase, app.user.id, addDays(date, -6), date),
    getWeights(app.supabase, app.user.id, addDays(today, -60)),
  ]);
  const insights = await getInsightsFor(app.supabase, app.user.id, { today: day, timeZone: app.timeZone, targets: app.targets, waterGoalMl: app.preferences.water_goal_ml, last7: week });

  const target = app.targets?.calories ?? null;
  const eaten = Math.round(day.totals.kcal);
  const remaining = target ? target - eaten : null;
  const hour = localHourFor(new Date(), app.timeZone);
  const greetingKey: MessageKey = hour < 12 ? 'dashboard.greetingMorning' : hour < 18 ? 'dashboard.greetingAfternoon' : 'dashboard.greetingEvening';
  const name = app.profile.display_name;
  const imperial = app.profile.units === 'imperial';
  const logged = week.filter((d) => d.meals > 0);
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;

  const quick = [
    { href: '/scan', label: t('dashboard.scanMeal'), icon: Camera, primary: true },
    { href: `/diary?date=${date}&add=1`, label: t('dashboard.addManually'), icon: Plus },
    { href: '/recipes', label: t('dashboard.browseRecipes'), icon: ChefHat },
    { href: `/diary?date=${date}`, label: t('dashboard.viewDiary'), icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{t.date(date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="font-display text-[1.85rem] leading-tight font-semibold tracking-tight sm:text-[2.2rem]">
            {name ? t(greetingKey, { name }) : t('dashboard.greetingNoName')}
          </h1>
        </div>
        <DayNav date={date} today={today} basePath="/dashboard" t={t} />
      </header>

      <Card className="grid gap-6 p-5 sm:p-7 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex justify-center">
          <PlateRing value={eaten} target={target} label={target ? `${eaten} / ${target} ${t('common.kcal')}` : `${eaten} ${t('common.kcal')}`}>
            <div>
              {remaining !== null ? (
                <>
                  <p className="font-display text-[2.6rem] leading-none font-semibold tabular text-ink">{t.num(Math.abs(remaining))}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t('common.kcal')} {remaining >= 0 ? t('dashboard.remaining') : t('dashboard.over')}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-[2.6rem] leading-none font-semibold tabular text-ink">{t.num(eaten)}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t('common.kcal')} {t('dashboard.consumed')}
                  </p>
                </>
              )}
            </div>
          </PlateRing>
        </div>
        <div className="space-y-5">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-ink-soft">{t('dashboard.consumed')}</p>
              <p className="font-display text-xl font-semibold tabular">
                {t.num(eaten)} <span className="text-sm font-normal text-ink-soft">{t('common.kcal')}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-soft">{t('targets.calories')}</p>
              <p className="font-display text-xl font-semibold tabular">
                {target ? (
                  <>
                    {t.num(target)} <span className="text-sm font-normal text-ink-soft">{t('common.kcal')}</span>
                  </>
                ) : (
                  <span className="text-base font-normal text-ink-soft">{t('dashboard.noTarget')}</span>
                )}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MacroBar kind="protein" label={t('macros.protein')} value={day.totals.protein_g} target={app.targets ? Number(app.targets.protein_g) : null} unit={t('common.g')} />
            <MacroBar kind="carbs" label={t('macros.carbs')} value={day.totals.carbs_g} target={app.targets ? Number(app.targets.carbs_g) : null} unit={t('common.g')} />
            <MacroBar kind="fat" label={t('macros.fat')} value={day.totals.fat_g} target={app.targets ? Number(app.targets.fat_g) : null} unit={t('common.g')} />
            <MacroBar kind="fiber" label={t('macros.fiber')} value={day.totals.fiber_g} target={app.targets?.fiber_g ? Number(app.targets.fiber_g) : null} unit={t('common.g')} />
          </div>
          <p className="text-xs text-ink-soft">{t('common.estimatesNote')}</p>
        </div>
      </Card>

      <nav aria-label={t('dashboard.quickActions')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quick.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className={
              q.primary
                ? 'flex items-center gap-2.5 rounded-2xl bg-rose-strong px-4 py-3.5 font-medium text-white shadow-lift transition-colors hover:bg-rose-ink'
                : 'flex items-center gap-2.5 rounded-2xl border border-line bg-paper px-4 py-3.5 font-medium text-ink transition-colors hover:border-rose'
            }
          >
            <q.icon className="h-5 w-5" aria-hidden />
            {q.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="timeline">
          <SectionTitle id="timeline">{t('dashboard.timeline')}</SectionTitle>
          <div className="space-y-5">
            {CATEGORIES.map((cat) => {
              const meals = day.meals.filter((m) => m.category === cat);
              const kcal = meals.reduce((s, m) => s + m.totals.kcal, 0);
              return (
                <div key={cat}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold tracking-wide text-ink-soft">{t(`meal.${cat}`)}</h3>
                    {meals.length > 0 && <span className="text-xs text-ink-soft tabular">{t.num(Math.round(kcal))} {t('common.kcal')}</span>}
                  </div>
                  {meals.length ? (
                    <div className="space-y-2">
                      {meals.map((m) => (
                        <MealCard key={m.id} meal={m} t={t} timeZone={app.timeZone} href={`/diary?date=${date}&meal=${m.id}`} />
                      ))}
                    </div>
                  ) : (
                    <Link
                      href={`/diary?date=${date}&add=1&category=${cat}`}
                      className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft hover:border-rose hover:text-rose-ink"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      {t('dashboard.addTo', { meal: t(`meal.${cat}`) })}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle>{t('dashboard.coachTitle')}</SectionTitle>
            <InsightList insights={insights} t={t} />
          </Card>

          <Card className="p-5">
            <WaterTracker date={date} totalMl={day.waterMl} goalMl={app.preferences.water_goal_ml} />
          </Card>

          <Card className="p-5">
            <SectionTitle>{t('dashboard.weekTitle')}</SectionTitle>
            {logged.length >= 2 ? (
              <>
                <WeekBars days={week} target={target} today={date} t={t} />
                <p className="mt-3 text-sm text-ink-soft">{t('dashboard.weekAverage', { kcal: avg, days: logged.length })}</p>
              </>
            ) : (
              <p className="text-sm text-ink-soft">{t('dashboard.weekEmpty')}</p>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle>{t('dashboard.weightTitle')}</SectionTitle>
            {weights.length >= 2 ? (
              <WeightSpark entries={weights} unitLabel={imperial ? t('common.lb') : t('common.kg')} toDisplay={imperial ? kgToLb : (k) => k} t={t} />
            ) : (
              <p className="text-sm text-ink-soft">{t('dashboard.weightEmpty')}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
