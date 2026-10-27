// Generated from the Supabase project schema (supabase gen types typescript).
// Regenerate after changing migrations: npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      ai_requests: {
        Row: { created_at: string; error_code: string | null; id: string; input_tokens: number | null; model: string; output_tokens: number | null; provider: string; status: string; user_id: string };
        Insert: { created_at?: string; error_code?: string | null; id?: string; input_tokens?: number | null; model: string; output_tokens?: number | null; provider: string; status: string; user_id: string };
        Update: { created_at?: string; error_code?: string | null; id?: string; input_tokens?: number | null; model?: string; output_tokens?: number | null; provider?: string; status?: string; user_id?: string };
        Relationships: [];
      };
      favorite_recipes: {
        Row: { created_at: string; recipe_id: string; user_id: string };
        Insert: { created_at?: string; recipe_id: string; user_id: string };
        Update: { created_at?: string; recipe_id?: string; user_id?: string };
        Relationships: [{ foreignKeyName: 'favorite_recipes_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] }];
      };
      foods: {
        Row: { aliases: string[]; carbs_100g: number; category: string | null; created_at: string; created_by: string | null; fat_100g: number; fiber_100g: number | null; id: string; kcal_100g: number; name: string; name_ar: string | null; name_fr: string | null; protein_100g: number; serving_grams: number | null; serving_unit: string | null; sodium_mg_100g: number | null; source: string; source_id: string | null; source_note: string | null; sugar_100g: number | null };
        Insert: { aliases?: string[]; carbs_100g?: number; category?: string | null; created_at?: string; created_by?: string | null; fat_100g?: number; fiber_100g?: number | null; id?: string; kcal_100g: number; name: string; name_ar?: string | null; name_fr?: string | null; protein_100g?: number; serving_grams?: number | null; serving_unit?: string | null; sodium_mg_100g?: number | null; source: string; source_id?: string | null; source_note?: string | null; sugar_100g?: number | null };
        Update: Partial<Database['public']['Tables']['foods']['Insert']>;
        Relationships: [];
      };
      meal_items: {
        Row: { carbs_100g: number; carbs_g: number; created_at: string; fat_100g: number; fat_g: number; fiber_100g: number | null; fiber_g: number | null; food_id: string | null; grams: number; id: string; kcal: number; kcal_100g: number; meal_id: string; name: string; nutrient_source: string; position: number; protein_100g: number; protein_g: number; user_id: string };
        Insert: { carbs_100g: number; carbs_g: number; created_at?: string; fat_100g: number; fat_g: number; fiber_100g?: number | null; fiber_g?: number | null; food_id?: string | null; grams: number; id?: string; kcal: number; kcal_100g: number; meal_id: string; name: string; nutrient_source: string; position?: number; protein_100g: number; protein_g: number; user_id: string };
        Update: Partial<Database['public']['Tables']['meal_items']['Insert']>;
        Relationships: [
          { foreignKeyName: 'meal_items_food_id_fkey'; columns: ['food_id']; isOneToOne: false; referencedRelation: 'foods'; referencedColumns: ['id'] },
          { foreignKeyName: 'meal_items_meal_id_fkey'; columns: ['meal_id']; isOneToOne: false; referencedRelation: 'meals'; referencedColumns: ['id'] },
        ];
      };
      meals: {
        Row: { analysis: Json | null; category: string; client_request_id: string; created_at: string; eaten_at: string; id: string; local_date: string; name: string; notes: string | null; photo_path: string | null; recipe_id: string | null; recipe_servings: number | null; source: string; updated_at: string; user_id: string };
        Insert: { analysis?: Json | null; category: string; client_request_id: string; created_at?: string; eaten_at: string; id?: string; local_date: string; name: string; notes?: string | null; photo_path?: string | null; recipe_id?: string | null; recipe_servings?: number | null; source: string; updated_at?: string; user_id: string };
        Update: Partial<Database['public']['Tables']['meals']['Insert']>;
        Relationships: [{ foreignKeyName: 'meals_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] }];
      };
      nutrition_targets: {
        Row: { bmi: number | null; bmr: number | null; calories: number; carbs_g: number; created_at: string; fat_g: number; fiber_g: number | null; formula_version: string; id: string; inputs: Json; is_custom: boolean; protein_g: number; tdee: number | null; user_id: string };
        Insert: { bmi?: number | null; bmr?: number | null; calories: number; carbs_g: number; created_at?: string; fat_g: number; fiber_g?: number | null; formula_version: string; id?: string; inputs?: Json; is_custom?: boolean; protein_g: number; tdee?: number | null; user_id: string };
        Update: Partial<Database['public']['Tables']['nutrition_targets']['Insert']>;
        Relationships: [];
      };
      planned_meals: {
        Row: { category: string; created_at: string; id: string; logged_meal_id: string | null; plan_date: string; recipe_id: string; servings: number; user_id: string };
        Insert: { category: string; created_at?: string; id?: string; logged_meal_id?: string | null; plan_date: string; recipe_id: string; servings?: number; user_id: string };
        Update: Partial<Database['public']['Tables']['planned_meals']['Insert']>;
        Relationships: [
          { foreignKeyName: 'planned_meals_logged_meal_id_fkey'; columns: ['logged_meal_id']; isOneToOne: false; referencedRelation: 'meals'; referencedColumns: ['id'] },
          { foreignKeyName: 'planned_meals_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] },
        ];
      };
      profiles: {
        Row: { activity_level: string | null; ai_photo_consent_at: string | null; created_at: string; date_of_birth: string | null; display_name: string | null; goal: string | null; height_cm: number | null; id: string; locale: string; onboarded_at: string | null; sex: string | null; target_weight_kg: number | null; timezone: string; units: string; updated_at: string; weight_kg: number | null };
        Insert: { activity_level?: string | null; ai_photo_consent_at?: string | null; created_at?: string; date_of_birth?: string | null; display_name?: string | null; goal?: string | null; height_cm?: number | null; id: string; locale?: string; onboarded_at?: string | null; sex?: string | null; target_weight_kg?: number | null; timezone?: string; units?: string; updated_at?: string; weight_kg?: number | null };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      recipe_ingredients: {
        Row: { food_id: string | null; grams: number; id: string; name: string; name_ar: string | null; name_fr: string | null; position: number; quantity: number; recipe_id: string; unit: string };
        Insert: { food_id?: string | null; grams: number; id?: string; name: string; name_ar?: string | null; name_fr?: string | null; position: number; quantity: number; recipe_id: string; unit: string };
        Update: Partial<Database['public']['Tables']['recipe_ingredients']['Insert']>;
        Relationships: [
          { foreignKeyName: 'recipe_ingredients_food_id_fkey'; columns: ['food_id']; isOneToOne: false; referencedRelation: 'foods'; referencedColumns: ['id'] },
          { foreignKeyName: 'recipe_ingredients_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] },
        ];
      };
      recipe_instructions: {
        Row: { body: string; body_ar: string | null; body_fr: string | null; id: string; recipe_id: string; step: number };
        Insert: { body: string; body_ar?: string | null; body_fr?: string | null; id?: string; recipe_id: string; step: number };
        Update: Partial<Database['public']['Tables']['recipe_instructions']['Insert']>;
        Relationships: [{ foreignKeyName: 'recipe_instructions_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] }];
      };
      recipes: {
        Row: { allergens: string[]; carbs_per_serving: number; cook_minutes: number; created_at: string; created_by: string | null; description: string; description_ar: string | null; description_fr: string | null; diet_tags: string[]; fat_per_serving: number; fiber_per_serving: number; id: string; image_credit: string | null; image_url: string | null; is_public: boolean; kcal_per_serving: number; meal_types: string[]; prep_minutes: number; protein_per_serving: number; servings: number; slug: string; title: string; title_ar: string | null; title_fr: string | null };
        Insert: { allergens?: string[]; carbs_per_serving: number; cook_minutes: number; created_at?: string; created_by?: string | null; description: string; description_ar?: string | null; description_fr?: string | null; diet_tags?: string[]; fat_per_serving: number; fiber_per_serving: number; id?: string; image_credit?: string | null; image_url?: string | null; is_public?: boolean; kcal_per_serving: number; meal_types?: string[]; prep_minutes: number; protein_per_serving: number; servings: number; slug: string; title: string; title_ar?: string | null; title_fr?: string | null };
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>;
        Relationships: [];
      };
      shopping_list_items: {
        Row: { checked: boolean; created_at: string; grams: number | null; id: string; name: string; quantity: number | null; unit: string | null; user_id: string; week_start: string };
        Insert: { checked?: boolean; created_at?: string; grams?: number | null; id?: string; name: string; quantity?: number | null; unit?: string | null; user_id: string; week_start: string };
        Update: Partial<Database['public']['Tables']['shopping_list_items']['Insert']>;
        Relationships: [];
      };
      user_preferences: {
        Row: { allergies: string[]; created_at: string; dietary_preferences: string[]; keep_meal_photos: boolean; restrictions_note: string | null; updated_at: string; user_id: string; water_goal_ml: number };
        Insert: { allergies?: string[]; created_at?: string; dietary_preferences?: string[]; keep_meal_photos?: boolean; restrictions_note?: string | null; updated_at?: string; user_id: string; water_goal_ml?: number };
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
        Relationships: [];
      };
      water_entries: {
        Row: { amount_ml: number; id: string; local_date: string; logged_at: string; user_id: string };
        Insert: { amount_ml: number; id?: string; local_date: string; logged_at?: string; user_id: string };
        Update: Partial<Database['public']['Tables']['water_entries']['Insert']>;
        Relationships: [];
      };
      weight_entries: {
        Row: { created_at: string; id: string; measured_on: string; note: string | null; user_id: string; weight_kg: number };
        Insert: { created_at?: string; id?: string; measured_on: string; note?: string | null; user_id: string; weight_kg: number };
        Update: Partial<Database['public']['Tables']['weight_entries']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      meal_totals: {
        Row: { carbs_g: number | null; fat_g: number | null; fiber_g: number | null; item_count: number | null; kcal: number | null; local_date: string | null; meal_id: string | null; protein_g: number | null; user_id: string | null };
        Relationships: Rel[];
      };
    };
    Functions: {
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      search_foods: { Args: { max_results?: number; q: string }; Returns: Database['public']['Tables']['foods']['Row'][] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> = (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
