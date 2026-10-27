import { NextResponse } from 'next/server';
import { requireUser, route } from '@/lib/api';

/** Downloads everything stored about the user as JSON (photos are listed by path). */
export const GET = route(async () => {
  const { supabase, user } = await requireUser();
  const [profile, preferences, targets, meals, items, weights, water, plans, favorites, foods, shopping] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('nutrition_targets').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('meals').select('*').eq('user_id', user.id).order('eaten_at'),
    supabase.from('meal_items').select('*').eq('user_id', user.id),
    supabase.from('weight_entries').select('*').eq('user_id', user.id).order('measured_on'),
    supabase.from('water_entries').select('*').eq('user_id', user.id).order('logged_at'),
    supabase.from('planned_meals').select('*').eq('user_id', user.id).order('plan_date'),
    supabase.from('favorite_recipes').select('*').eq('user_id', user.id),
    supabase.from('foods').select('*').eq('created_by', user.id),
    supabase.from('shopping_list_items').select('*').eq('user_id', user.id),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    preferences: preferences.data,
    nutrition_targets: targets.data,
    meals: meals.data,
    meal_items: items.data,
    weight_entries: weights.data,
    water_entries: water.data,
    planned_meals: plans.data,
    favorite_recipes: favorites.data,
    custom_foods: foods.data,
    shopping_list_items: shopping.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="nutritrack-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
});
