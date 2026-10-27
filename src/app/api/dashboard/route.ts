import { ApiError, ok, requireUser, route } from '@/lib/api';
import { addDays, localDateFor, safeTimeZone } from '@/lib/dates';
import { localDate } from '@/lib/validation';
import { loadProfileBundle } from '@/lib/server/profile';
import { getDailyTotals, getDay, getInsightsFor } from '@/lib/server/diary';

/** Day summary computed from saved meals: totals, meals, water, targets and data-grounded insights. */
export const GET = route(async (req) => {
  const { supabase, user } = await requireUser();
  const bundle = await loadProfileBundle(supabase, user.id);
  if (!bundle?.profile.onboarded_at) throw new ApiError(409, 'onboarding_required');
  const tz = safeTimeZone(bundle.profile.timezone);
  const param = new URL(req.url).searchParams.get('date');
  const date = param ? localDate.parse(param) : localDateFor(new Date(), tz);

  const [day, last7] = await Promise.all([getDay(supabase, user.id, date), getDailyTotals(supabase, user.id, addDays(date, -6), date)]);
  const insights = await getInsightsFor(supabase, user.id, {
    today: day,
    timeZone: tz,
    targets: bundle.targets,
    waterGoalMl: bundle.preferences.water_goal_ml,
    last7,
  });
  return ok({ date, timeZone: tz, day, last7, targets: bundle.targets, insights });
});
