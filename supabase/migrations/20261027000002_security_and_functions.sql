-- Row Level Security, storage bucket, and RPC functions

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_instructions enable row level security;
alter table public.favorite_recipes enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.planned_meals enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.weight_entries enable row level security;
alter table public.water_entries enable row level security;
alter table public.ai_requests enable row level security;

-- Profiles and preferences: owner only. Rows are created by the signup trigger.
create policy "profiles: owner reads" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: owner updates" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "preferences: owner reads" on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "preferences: owner updates" on public.user_preferences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Owner-only tables with a user_id column
do $$
declare
  t text;
begin
  foreach t in array array[
    'nutrition_targets', 'favorite_recipes', 'meals', 'planned_meals',
    'shopping_list_items', 'weight_entries', 'water_entries', 'ai_requests'
  ] loop
    execute format('create policy "%1$s: owner reads" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: owner inserts" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: owner updates" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: owner deletes" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Meal items: owner only, and the parent meal must belong to the same user.
create policy "meal_items: owner reads" on public.meal_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "meal_items: owner inserts" on public.meal_items
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))
  );
create policy "meal_items: owner updates" on public.meal_items
  for update to authenticated using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))
  );
create policy "meal_items: owner deletes" on public.meal_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Planned meals may only point at a meal the same user owns.
create or replace function public.check_planned_meal_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.logged_meal_id is not null and not exists (
    select 1 from public.meals m where m.id = new.logged_meal_id and m.user_id = new.user_id
  ) then
    raise exception 'logged meal does not belong to this user';
  end if;
  return new;
end;
$$;

create trigger planned_meals_owner_check before insert or update on public.planned_meals
  for each row execute function public.check_planned_meal_owner();

-- Foods: shared catalog is readable by everyone signed in; private rows by their owner.
create policy "foods: read catalog and own" on public.foods
  for select to authenticated using (created_by is null or created_by = (select auth.uid()));
create policy "foods: insert own" on public.foods
  for insert to authenticated with check (
    created_by = (select auth.uid()) and source in ('user', 'usda', 'open_food_facts')
  );
create policy "foods: update own" on public.foods
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "foods: delete own" on public.foods
  for delete to authenticated using (created_by = (select auth.uid()));

-- Recipes: public recipes readable by anyone (including signed-out visitors); writes by owner only.
create policy "recipes: read public and own" on public.recipes
  for select to anon, authenticated using (is_public or created_by = (select auth.uid()));
create policy "recipes: insert own" on public.recipes
  for insert to authenticated with check (created_by = (select auth.uid()) and is_public = false);
create policy "recipes: update own" on public.recipes
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()) and is_public = false);
create policy "recipes: delete own" on public.recipes
  for delete to authenticated using (created_by = (select auth.uid()));

create policy "recipe_ingredients: read visible" on public.recipe_ingredients
  for select to anon, authenticated using (
    exists (select 1 from public.recipes r where r.id = recipe_id and (r.is_public or r.created_by = (select auth.uid())))
  );
create policy "recipe_ingredients: write own" on public.recipe_ingredients
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.created_by = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.created_by = (select auth.uid())));

create policy "recipe_instructions: read visible" on public.recipe_instructions
  for select to anon, authenticated using (
    exists (select 1 from public.recipes r where r.id = recipe_id and (r.is_public or r.created_by = (select auth.uid())))
  );
create policy "recipe_instructions: write own" on public.recipe_instructions
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.created_by = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.created_by = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Food search (fuzzy, multilingual). Runs with the caller's privileges, so RLS applies.
-- ---------------------------------------------------------------------------
create or replace function public.search_foods(q text, max_results integer default 12)
returns setof public.foods
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (select lower(trim(q)) as t)
  select f.*
  from public.foods f, term
  where char_length(term.t) >= 1
    and (
      lower(f.name) like '%' || term.t || '%'
      or lower(coalesce(f.name_fr, '')) like '%' || term.t || '%'
      or coalesce(f.name_ar, '') like '%' || term.t || '%'
      or exists (select 1 from unnest(f.aliases) a where lower(a) like '%' || term.t || '%')
      or extensions.similarity(lower(f.name), term.t) > 0.3
      or extensions.similarity(lower(coalesce(f.name_fr, '')), term.t) > 0.3
    )
  order by
    (lower(f.name) = term.t or lower(coalesce(f.name_fr, '')) = term.t) desc,
    (lower(f.name) like term.t || '%') desc,
    greatest(
      extensions.similarity(lower(f.name), term.t),
      extensions.similarity(lower(coalesce(f.name_fr, '')), term.t),
      extensions.similarity(coalesce(f.name_ar, ''), term.t)
    ) desc,
    f.created_by nulls last,
    char_length(f.name)
  limit least(greatest(max_results, 1), 30);
$$;

grant execute on function public.search_foods(text, integer) to authenticated;
revoke execute on function public.search_foods(text, integer) from anon, public;

-- ---------------------------------------------------------------------------
-- Account deletion: removes the auth user; every user-owned row cascades.
-- Storage objects are removed by the app before this is called.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from anon, public;
grant execute on function public.delete_my_account() to authenticated;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Private meal photo storage: <user_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;

create policy "meal photos: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal photos: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal photos: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
