-- NutriTrack core schema
-- All private user data is owned by auth.users(id) and protected by RLS.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  date_of_birth date check (date_of_birth > '1900-01-01'),
  sex text check (sex in ('male', 'female')),
  height_cm numeric(5, 1) check (height_cm between 50 and 260),
  weight_kg numeric(5, 1) check (weight_kg between 20 and 400),
  target_weight_kg numeric(5, 1) check (target_weight_kg between 20 and 400),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text check (goal in ('maintain', 'lose', 'gain')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  locale text not null default 'en' check (locale in ('en', 'fr', 'ar')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  ai_photo_consent_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dietary_preferences text[] not null default '{}',
  allergies text[] not null default '{}',
  restrictions_note text check (char_length(restrictions_note) <= 500),
  water_goal_ml integer not null default 2000 check (water_goal_ml between 250 and 8000),
  keep_meal_photos boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- Create an empty profile + preferences row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Nutrition targets (history kept; latest row is current)
-- ---------------------------------------------------------------------------
create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  calories integer not null check (calories between 800 and 6000),
  protein_g numeric(6, 1) not null check (protein_g >= 0),
  carbs_g numeric(6, 1) not null check (carbs_g >= 0),
  fat_g numeric(6, 1) not null check (fat_g >= 0),
  fiber_g numeric(6, 1) check (fiber_g >= 0),
  bmi numeric(5, 2),
  bmr integer,
  tdee integer,
  is_custom boolean not null default false,
  formula_version text not null,
  inputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index nutrition_targets_user_created_idx on public.nutrition_targets (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Foods catalog
-- created_by null  => shared catalog entry (read-only for users)
-- created_by = uid => private entry (user-created or cached from an external API)
-- ---------------------------------------------------------------------------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  name_fr text,
  name_ar text,
  aliases text[] not null default '{}',
  category text,
  kcal_100g numeric(7, 2) not null check (kcal_100g between 0 and 950),
  protein_100g numeric(6, 2) not null default 0 check (protein_100g between 0 and 100),
  carbs_100g numeric(6, 2) not null default 0 check (carbs_100g between 0 and 100),
  fat_100g numeric(6, 2) not null default 0 check (fat_100g between 0 and 100),
  fiber_100g numeric(6, 2) check (fiber_100g between 0 and 100),
  sugar_100g numeric(6, 2) check (sugar_100g between 0 and 100),
  sodium_mg_100g numeric(8, 2) check (sodium_mg_100g >= 0),
  serving_unit text,
  serving_grams numeric(7, 1) check (serving_grams > 0),
  source text not null check (source in ('starter', 'usda', 'open_food_facts', 'user')),
  source_id text,
  source_note text,
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index foods_name_trgm_idx on public.foods using gin (name extensions.gin_trgm_ops);
create index foods_name_fr_trgm_idx on public.foods using gin (name_fr extensions.gin_trgm_ops);
create index foods_name_ar_trgm_idx on public.foods using gin (name_ar extensions.gin_trgm_ops);
create index foods_created_by_idx on public.foods (created_by);
create unique index foods_external_source_uidx on public.foods (created_by, source, source_id)
  where source_id is not null;

-- ---------------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_fr text,
  title_ar text,
  description text not null,
  description_fr text,
  description_ar text,
  image_url text,
  image_credit text,
  servings integer not null check (servings between 1 and 24),
  prep_minutes integer not null check (prep_minutes >= 0),
  cook_minutes integer not null check (cook_minutes >= 0),
  meal_types text[] not null default '{}',
  diet_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  kcal_per_serving numeric(7, 1) not null,
  protein_per_serving numeric(6, 1) not null,
  carbs_per_serving numeric(6, 1) not null,
  fat_per_serving numeric(6, 1) not null,
  fiber_per_serving numeric(6, 1) not null,
  is_public boolean not null default true,
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null,
  food_id uuid references public.foods (id) on delete set null,
  name text not null,
  name_fr text,
  name_ar text,
  quantity numeric(8, 2) not null check (quantity > 0),
  unit text not null,
  grams numeric(8, 1) not null check (grams >= 0),
  unique (recipe_id, position)
);

create index recipe_ingredients_food_idx on public.recipe_ingredients (food_id);

create table public.recipe_instructions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step integer not null check (step > 0),
  body text not null,
  body_fr text,
  body_ar text,
  unique (recipe_id, step)
);

create table public.favorite_recipes (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index favorite_recipes_recipe_idx on public.favorite_recipes (recipe_id);

-- ---------------------------------------------------------------------------
-- Meals (the diary)
-- local_date is the user's calendar date in their timezone at the time eaten.
-- ---------------------------------------------------------------------------
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_request_id uuid not null,
  category text not null check (category in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(name) between 1 and 120),
  eaten_at timestamptz not null,
  local_date date not null,
  source text not null check (source in ('manual', 'scan', 'recipe')),
  recipe_id uuid references public.recipes (id) on delete set null,
  recipe_servings numeric(5, 2) check (recipe_servings > 0),
  photo_path text,
  analysis jsonb,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_request_id)
);

create index meals_user_date_idx on public.meals (user_id, local_date);
create index meals_recipe_idx on public.meals (recipe_id);

create trigger meals_updated_at before update on public.meals
  for each row execute function public.set_updated_at();

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null default 0,
  food_id uuid references public.foods (id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  grams numeric(7, 1) not null check (grams > 0 and grams <= 5000),
  -- source values (per 100 g) captured at save time
  kcal_100g numeric(7, 2) not null,
  protein_100g numeric(6, 2) not null,
  carbs_100g numeric(6, 2) not null,
  fat_100g numeric(6, 2) not null,
  fiber_100g numeric(6, 2),
  -- calculated values for this portion
  kcal numeric(8, 1) not null,
  protein_g numeric(7, 1) not null,
  carbs_g numeric(7, 1) not null,
  fat_g numeric(7, 1) not null,
  fiber_g numeric(7, 1),
  nutrient_source text not null check (nutrient_source in ('database', 'ai_estimate', 'manual', 'recipe')),
  created_at timestamptz not null default now()
);

create index meal_items_meal_idx on public.meal_items (meal_id);
create index meal_items_user_idx on public.meal_items (user_id);
create index meal_items_food_idx on public.meal_items (food_id);

create view public.meal_totals with (security_invoker = true) as
select
  m.id as meal_id,
  m.user_id,
  m.local_date,
  coalesce(sum(i.kcal), 0)::numeric(8, 1) as kcal,
  coalesce(sum(i.protein_g), 0)::numeric(7, 1) as protein_g,
  coalesce(sum(i.carbs_g), 0)::numeric(7, 1) as carbs_g,
  coalesce(sum(i.fat_g), 0)::numeric(7, 1) as fat_g,
  coalesce(sum(i.fiber_g), 0)::numeric(7, 1) as fiber_g,
  count(i.id) as item_count
from public.meals m
left join public.meal_items i on i.meal_id = m.id
group by m.id;

-- ---------------------------------------------------------------------------
-- Planner and shopping list
-- ---------------------------------------------------------------------------
create table public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  category text not null check (category in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings numeric(5, 2) not null default 1 check (servings > 0 and servings <= 24),
  logged_meal_id uuid references public.meals (id) on delete set null,
  created_at timestamptz not null default now()
);

create index planned_meals_user_date_idx on public.planned_meals (user_id, plan_date);
create index planned_meals_recipe_idx on public.planned_meals (recipe_id);
create index planned_meals_logged_idx on public.planned_meals (logged_meal_id);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  name text not null check (char_length(name) between 1 and 200),
  quantity numeric(9, 2),
  unit text,
  grams numeric(9, 1),
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index shopping_list_user_week_idx on public.shopping_list_items (user_id, week_start);

-- ---------------------------------------------------------------------------
-- Body measurements and water
-- ---------------------------------------------------------------------------
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 1) not null check (weight_kg between 20 and 400),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create table public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  amount_ml integer not null check (amount_ml between 1 and 3000),
  logged_at timestamptz not null default now()
);

create index water_entries_user_date_idx on public.water_entries (user_id, local_date);

-- ---------------------------------------------------------------------------
-- AI usage log (rate limiting and cost control)
-- ---------------------------------------------------------------------------
create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  model text not null,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  input_tokens integer,
  output_tokens integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index ai_requests_user_created_idx on public.ai_requests (user_id, created_at desc);
