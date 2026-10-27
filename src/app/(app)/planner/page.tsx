import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireAppUser } from '@/lib/server/profile';
import { addDays, isLocalDate, localDateFor, localTimeFor, startOfWeek } from '@/lib/dates';
import { localized } from '@/lib/localized';
import { getT } from '@/i18n/server';
import { PageHeader } from '@/components/ui/surface';
import { PlannerBoard, type PlannedRow } from '@/components/planner/planner-board';

export const metadata = { title: 'Meal plan' };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const app = await requireAppUser();
  const t = await getT();
  const sp = await searchParams;
  const today = localDateFor(new Date(), app.timeZone);
  const week = startOfWeek(sp.week && isLocalDate(sp.week) ? sp.week : today);

  const [plannedRes, recipesRes, shoppingRes] = await Promise.all([
    app.supabase
      .from('planned_meals')
      .select('id, plan_date, category, servings, logged_meal_id, recipe:recipes(id, slug, title, title_fr, title_ar, kcal_per_serving)')
      .eq('user_id', app.user.id)
      .gte('plan_date', week)
      .lte('plan_date', addDays(week, 6))
      .order('created_at'),
    app.supabase.from('recipes').select('id, title, title_fr, title_ar, kcal_per_serving, meal_types').order('title'),
    app.supabase.from('shopping_list_items').select('id, name, quantity, unit, grams, checked').eq('user_id', app.user.id).eq('week_start', week).order('name'),
  ]);

  const planned: PlannedRow[] = (plannedRes.data ?? [])
    .filter((p) => p.recipe)
    .map((p) => ({
      id: p.id,
      plan_date: p.plan_date,
      category: p.category as PlannedRow['category'],
      servings: Number(p.servings),
      logged_meal_id: p.logged_meal_id,
      recipe: { id: p.recipe!.id, slug: p.recipe!.slug, title: localized(p.recipe!, 'title', t.locale), kcal_per_serving: Number(p.recipe!.kcal_per_serving) },
    }));

  const nav = (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-paper p-1 shadow-soft">
      <Link href={`/planner?week=${addDays(week, -7)}`} className="rounded-full p-1.5 text-ink-soft hover:bg-blush-deep" aria-label={t('planner.previousWeek')}>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </Link>
      <span className="px-2 text-sm font-medium">{t('planner.weekOf', { date: t.date(week, { day: 'numeric', month: 'long' }) })}</span>
      <Link href={`/planner?week=${addDays(week, 7)}`} className="rounded-full p-1.5 text-ink-soft hover:bg-blush-deep" aria-label={t('planner.nextWeek')}>
        <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </Link>
    </div>
  );

  return (
    <div>
      <PageHeader title={t('planner.title')} lead={t('planner.lead')} action={nav} />
      <PlannerBoard
        key={week}
        week={week}
        today={today}
        nowTime={localTimeFor(new Date(), app.timeZone)}
        planned={planned}
        recipes={(recipesRes.data ?? []).map((r) => ({ id: r.id, title: localized(r, 'title', t.locale), kcal_per_serving: Number(r.kcal_per_serving), meal_types: r.meal_types }))}
        shopping={(shoppingRes.data ?? []).map((s) => ({ ...s, quantity: s.quantity === null ? null : Number(s.quantity), grams: s.grams === null ? null : Number(s.grams) }))}
      />
    </div>
  );
}
