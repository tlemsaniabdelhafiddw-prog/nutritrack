// Starter food dataset for NutriTrack.
//
// These are approximate per-100 g values compiled from USDA FoodData Central
// (SR Legacy / Foundation reference entries) for common generic foods.
// They are clearly labelled in the app as "Starter dataset — approximate",
// not as verified external records. Connect USDA FoodData Central
// (FDC_API_KEY) to search and cache verified entries with their fdcId.
//
// Columns: key, name (en), name (fr), name (ar), category,
//          kcal, protein g, carbs g, fat g, fiber g,
//          serving unit, serving grams, aliases

export const STARTER_NOTE =
  'Starter dataset: approximate values based on USDA FoodData Central reference entries for generic foods. Verify for clinical use.';

export const foods = [
  // Proteins
  ['chicken_breast_cooked', 'Chicken breast, skinless, roasted', 'Blanc de poulet, sans peau, rôti', 'صدر دجاج مشوي بدون جلد', 'protein', 165, 31.0, 0, 3.6, 0, 'piece', 120, ['grilled chicken', 'poulet grillé', 'chicken']],
  ['chicken_thigh_cooked', 'Chicken thigh, skinless, roasted', 'Cuisse de poulet, sans peau, rôtie', 'فخذ دجاج مشوي بدون جلد', 'protein', 209, 26.0, 0, 10.9, 0, 'piece', 100, ['chicken leg']],
  ['beef_ground_90_cooked', 'Ground beef 90% lean, cooked', 'Bœuf haché 10 % MG, cuit', 'لحم بقري مفروم قليل الدهن مطبوخ', 'protein', 217, 26.1, 0, 11.7, 0, 'portion', 100, ['minced beef', 'viande hachée', 'kefta']],
  ['lamb_leg_roasted', 'Lamb leg, roasted', 'Gigot d\'agneau, rôti', 'فخذ خروف مشوي', 'protein', 258, 25.6, 0, 16.5, 0, 'portion', 100, ['lamb', 'agneau', 'mouton']],
  ['salmon_cooked', 'Salmon, Atlantic, farmed, cooked', 'Saumon de l\'Atlantique, d\'élevage, cuit', 'سلمون أطلسي مطبوخ', 'protein', 206, 22.1, 0, 12.4, 0, 'fillet', 150, ['saumon']],
  ['cod_cooked', 'Cod, cooked', 'Cabillaud, cuit', 'سمك القد مطبوخ', 'protein', 105, 22.8, 0, 0.9, 0, 'fillet', 150, ['white fish', 'poisson blanc', 'merlu']],
  ['tuna_canned_water', 'Tuna, canned in water, drained', 'Thon au naturel, égoutté', 'تونة معلبة بالماء مصفاة', 'protein', 116, 25.5, 0, 0.8, 0, 'can', 120, ['thon']],
  ['sardines_canned_oil', 'Sardines, canned in oil, drained', 'Sardines à l\'huile, égouttées', 'سردين معلب بالزيت مصفى', 'protein', 208, 24.6, 0, 11.5, 0, 'can', 90, ['sardine']],
  ['shrimp_cooked', 'Shrimp, cooked', 'Crevettes, cuites', 'جمبري مطبوخ', 'protein', 99, 24.0, 0.2, 0.3, 0, 'portion', 100, ['prawns', 'crevette']],
  ['egg_whole', 'Egg, whole, raw', 'Œuf entier, cru', 'بيضة كاملة نيئة', 'protein', 143, 12.6, 0.7, 9.5, 0, 'large egg', 50, ['eggs', 'oeuf', 'بيض']],
  ['egg_boiled', 'Egg, hard-boiled', 'Œuf dur', 'بيضة مسلوقة', 'protein', 155, 12.6, 1.1, 10.6, 0, 'large egg', 50, ['boiled egg']],
  ['tofu_firm', 'Tofu, firm', 'Tofu ferme', 'توفو صلب', 'protein', 144, 17.3, 2.8, 8.7, 2.3, 'portion', 100, []],

  // Grains and starches
  ['rice_white_cooked', 'Rice, white, long-grain, cooked', 'Riz blanc long, cuit', 'أرز أبيض مطبوخ', 'grain', 130, 2.7, 28.2, 0.3, 0.4, 'cup', 158, ['rice', 'riz', 'رز']],
  ['rice_brown_cooked', 'Rice, brown, long-grain, cooked', 'Riz complet, cuit', 'أرز بني مطبوخ', 'grain', 123, 2.7, 25.6, 1.0, 1.6, 'cup', 195, ['brown rice']],
  ['couscous_cooked', 'Couscous, cooked', 'Couscous, cuit', 'كسكس مطبوخ', 'grain', 112, 3.8, 23.2, 0.2, 1.4, 'cup', 157, ['kousksi', 'seksu', 'طعام']],
  ['couscous_dry', 'Couscous, dry', 'Couscous, sec', 'كسكس جاف', 'grain', 376, 12.8, 77.4, 0.6, 5.0, 'cup', 173, []],
  ['pasta_cooked', 'Pasta, cooked', 'Pâtes, cuites', 'معكرونة مطبوخة', 'grain', 158, 5.8, 30.9, 0.9, 1.8, 'cup', 140, ['spaghetti', 'penne', 'macaroni']],
  ['pasta_dry', 'Pasta or vermicelli, dry', 'Pâtes ou vermicelles, secs', 'معكرونة أو شعرية جافة', 'grain', 371, 13.0, 74.7, 1.5, 3.2, 'portion', 80, ['vermicelli', 'chorba frik', 'شعرية']],
  ['quinoa_cooked', 'Quinoa, cooked', 'Quinoa, cuit', 'كينوا مطبوخة', 'grain', 120, 4.4, 21.3, 1.9, 2.8, 'cup', 185, []],
  ['bulgur_cooked', 'Bulgur, cooked', 'Boulgour, cuit', 'برغل مطبوخ', 'grain', 83, 3.1, 18.6, 0.2, 4.5, 'cup', 182, ['burghul', 'freekeh']],
  ['oats_rolled', 'Oats, rolled, dry', 'Flocons d\'avoine', 'شوفان', 'grain', 389, 16.9, 66.3, 6.9, 10.6, 'cup', 81, ['oatmeal', 'porridge', 'avoine']],
  ['bread_whole_wheat', 'Bread, whole wheat', 'Pain complet', 'خبز القمح الكامل', 'grain', 252, 12.4, 42.7, 3.5, 6.0, 'slice', 32, ['wholemeal bread']],
  ['bread_french', 'Bread, French baguette', 'Baguette', 'خبز فرنسي (باقيت)', 'grain', 274, 10.8, 51.9, 3.3, 2.2, 'piece (1/4 baguette)', 64, ['baguette', 'khobz', 'خبز']],
  ['pita_white', 'Pita bread, white', 'Pain pita', 'خبز بيتا أبيض', 'grain', 275, 9.1, 55.7, 1.2, 2.2, 'pita (17 cm)', 60, ['pita', 'flatbread']],
  ['flour_all_purpose', 'Wheat flour, all-purpose', 'Farine de blé', 'دقيق القمح', 'grain', 364, 10.3, 76.3, 1.0, 2.7, 'tbsp', 8, ['flour', 'farine']],
  ['potato_boiled', 'Potato, boiled, without skin', 'Pomme de terre, bouillie', 'بطاطا مسلوقة', 'vegetable', 87, 1.9, 20.1, 0.1, 1.8, 'medium', 150, ['potatoes', 'pomme de terre', 'batata']],
  ['sweet_potato_baked', 'Sweet potato, baked', 'Patate douce, cuite au four', 'بطاطا حلوة مشوية', 'vegetable', 90, 2.0, 20.7, 0.2, 3.3, 'medium', 130, ['patate douce']],
  ['corn_sweet_cooked', 'Sweet corn, cooked', 'Maïs doux, cuit', 'ذرة حلوة مطبوخة', 'vegetable', 96, 3.4, 21.0, 1.5, 2.4, 'cup', 145, ['corn', 'maïs']],

  // Legumes
  ['lentils_cooked', 'Lentils, boiled', 'Lentilles, cuites', 'عدس مطبوخ', 'legume', 116, 9.0, 20.1, 0.4, 7.9, 'cup', 198, ['lentil', 'lentille', 'عدس']],
  ['lentils_dry', 'Lentils, dry', 'Lentilles, sèches', 'عدس جاف', 'legume', 352, 24.6, 63.4, 1.1, 10.7, 'cup', 192, []],
  ['chickpeas_cooked', 'Chickpeas, boiled', 'Pois chiches, cuits', 'حمص مطبوخ', 'legume', 164, 8.9, 27.4, 2.6, 7.6, 'cup', 164, ['garbanzo', 'pois chiche', 'hommos']],
  ['black_beans_cooked', 'Black beans, boiled', 'Haricots noirs, cuits', 'فاصوليا سوداء مطبوخة', 'legume', 132, 8.9, 23.7, 0.5, 8.7, 'cup', 172, []],
  ['white_beans_cooked', 'White beans, boiled', 'Haricots blancs, cuits', 'فاصوليا بيضاء مطبوخة', 'legume', 140, 8.2, 26.1, 0.6, 10.5, 'cup', 182, ['loubia', 'navy beans', 'لوبيا']],
  ['green_peas_cooked', 'Green peas, boiled', 'Petits pois, cuits', 'بازلاء مطبوخة', 'legume', 84, 5.4, 15.6, 0.2, 5.5, 'cup', 160, ['peas', 'petits pois', 'جلبانة']],
  ['hummus', 'Hummus', 'Houmous', 'حمص بالطحينة', 'legume', 166, 7.9, 14.3, 9.6, 6.0, 'tbsp', 15, ['houmous', 'hummus dip']],

  // Vegetables
  ['tomato', 'Tomato, raw', 'Tomate, crue', 'طماطم', 'vegetable', 18, 0.9, 3.9, 0.2, 1.2, 'medium', 123, ['tomatoes', 'tomate']],
  ['tomato_canned_crushed', 'Tomatoes, canned, crushed', 'Tomates concassées en conserve', 'طماطم معلبة مهروسة', 'vegetable', 32, 1.6, 7.3, 0.3, 1.9, 'cup', 242, []],
  ['tomato_paste', 'Tomato paste', 'Concentré de tomate', 'معجون الطماطم', 'vegetable', 82, 4.3, 18.9, 0.5, 4.1, 'tbsp', 16, ['tomato concentrate']],
  ['cucumber', 'Cucumber, with peel', 'Concombre', 'خيار', 'vegetable', 15, 0.7, 3.6, 0.1, 0.5, 'medium', 200, []],
  ['onion', 'Onion, raw', 'Oignon, cru', 'بصل', 'vegetable', 40, 1.1, 9.3, 0.1, 1.7, 'medium', 110, ['oignon']],
  ['garlic', 'Garlic, raw', 'Ail, cru', 'ثوم', 'vegetable', 149, 6.4, 33.1, 0.5, 2.1, 'clove', 3, ['ail']],
  ['carrot', 'Carrot, raw', 'Carotte, crue', 'جزر', 'vegetable', 41, 0.9, 9.6, 0.2, 2.8, 'medium', 61, ['carotte']],
  ['zucchini', 'Zucchini, raw', 'Courgette, crue', 'كوسة', 'vegetable', 17, 1.2, 3.1, 0.3, 1.0, 'medium', 196, ['courgette']],
  ['bell_pepper_red', 'Bell pepper, red, raw', 'Poivron rouge, cru', 'فلفل أحمر حلو', 'vegetable', 31, 1.0, 6.0, 0.3, 2.1, 'medium', 119, ['poivron', 'pepper', 'فلفل']],
  ['bell_pepper_green', 'Bell pepper, green, raw', 'Poivron vert, cru', 'فلفل أخضر حلو', 'vegetable', 20, 0.9, 4.6, 0.2, 1.7, 'medium', 119, []],
  ['eggplant_cooked', 'Eggplant, cooked', 'Aubergine, cuite', 'باذنجان مطبوخ', 'vegetable', 35, 0.8, 8.7, 0.2, 2.5, 'cup', 99, ['aubergine', 'بادنجان']],
  ['spinach_raw', 'Spinach, raw', 'Épinards, crus', 'سبانخ', 'vegetable', 23, 2.9, 3.6, 0.4, 2.2, 'cup', 30, ['épinard']],
  ['lettuce_romaine', 'Lettuce, romaine', 'Laitue romaine', 'خس روماني', 'vegetable', 17, 1.2, 3.3, 0.3, 2.1, 'cup, shredded', 47, ['salad leaves', 'salade', 'laitue']],
  ['broccoli_cooked', 'Broccoli, cooked', 'Brocoli, cuit', 'بروكلي مطبوخ', 'vegetable', 35, 2.4, 7.2, 0.4, 3.3, 'cup', 156, ['brocoli']],
  ['cabbage', 'Cabbage, raw', 'Chou, cru', 'ملفوف', 'vegetable', 25, 1.3, 5.8, 0.1, 2.5, 'cup, chopped', 89, ['chou']],
  ['mushrooms', 'Mushrooms, white, raw', 'Champignons de Paris, crus', 'فطر أبيض', 'vegetable', 22, 3.1, 3.3, 0.3, 1.0, 'cup, sliced', 70, ['champignon']],
  ['celery', 'Celery, raw', 'Céleri, cru', 'كرفس', 'vegetable', 14, 0.7, 3.0, 0.2, 1.6, 'stalk', 40, ['céleri']],
  ['parsley', 'Parsley, fresh', 'Persil, frais', 'بقدونس', 'herb', 36, 3.0, 6.3, 0.8, 3.3, 'tbsp', 4, ['persil', 'معدنوس']],
  ['coriander', 'Coriander (cilantro), fresh', 'Coriandre, fraîche', 'كزبرة خضراء', 'herb', 23, 2.1, 3.7, 0.5, 2.8, 'tbsp', 1, ['cilantro', 'coriandre']],
  ['mint', 'Mint, fresh', 'Menthe, fraîche', 'نعناع', 'herb', 70, 3.8, 14.9, 0.9, 8.0, 'tbsp', 2, ['menthe', 'نعناع']],
  ['olives_green', 'Olives, green', 'Olives vertes', 'زيتون أخضر', 'vegetable', 145, 1.0, 3.8, 15.3, 3.3, 'olive', 3, ['olive']],
  ['olives_black', 'Olives, black, ripe', 'Olives noires', 'زيتون أسود', 'vegetable', 115, 0.8, 6.3, 10.7, 3.2, 'olive', 4, []],

  // Fruit
  ['banana', 'Banana', 'Banane', 'موز', 'fruit', 89, 1.1, 22.8, 0.3, 2.6, 'medium', 118, ['banane']],
  ['apple', 'Apple, with skin', 'Pomme', 'تفاح', 'fruit', 52, 0.3, 13.8, 0.2, 2.4, 'medium', 182, ['pomme']],
  ['orange', 'Orange', 'Orange', 'برتقال', 'fruit', 47, 0.9, 11.8, 0.1, 2.4, 'medium', 131, ['tchina', 'تشينة']],
  ['dates_deglet', 'Dates, Deglet Noor', 'Dattes Deglet Nour', 'تمر دقلة نور', 'fruit', 282, 2.5, 75.0, 0.4, 8.0, 'date', 7, ['date', 'datte', 'تمر']],
  ['strawberries', 'Strawberries', 'Fraises', 'فراولة', 'fruit', 32, 0.7, 7.7, 0.3, 2.0, 'cup', 152, ['fraise']],
  ['blueberries', 'Blueberries', 'Myrtilles', 'توت أزرق', 'fruit', 57, 0.7, 14.5, 0.3, 2.4, 'cup', 148, ['myrtille']],
  ['grapes', 'Grapes', 'Raisin', 'عنب', 'fruit', 69, 0.7, 18.1, 0.2, 0.9, 'cup', 151, ['raisin']],
  ['watermelon', 'Watermelon', 'Pastèque', 'بطيخ أحمر', 'fruit', 30, 0.6, 7.6, 0.2, 0.4, 'cup, diced', 152, ['pastèque', 'دلاع']],
  ['figs_fresh', 'Figs, fresh', 'Figues fraîches', 'تين طازج', 'fruit', 74, 0.8, 19.2, 0.3, 2.9, 'medium', 50, ['figue', 'كرموس']],
  ['pomegranate', 'Pomegranate seeds', 'Grenade (grains)', 'رمان', 'fruit', 83, 1.7, 18.7, 1.2, 4.0, 'cup', 87, ['grenade']],
  ['kiwi', 'Kiwifruit', 'Kiwi', 'كيوي', 'fruit', 61, 1.1, 14.7, 0.5, 3.0, 'medium', 69, []],
  ['avocado', 'Avocado', 'Avocat', 'أفوكادو', 'fruit', 160, 2.0, 8.5, 14.7, 6.7, 'half', 68, ['avocat']],
  ['lemon_juice', 'Lemon juice', 'Jus de citron', 'عصير ليمون', 'fruit', 22, 0.4, 6.9, 0.2, 0.3, 'tbsp', 15, ['lemon', 'citron']],

  // Dairy
  ['greek_yogurt_nonfat', 'Greek yogurt, plain, nonfat', 'Yaourt grec nature 0 %', 'زبادي يوناني خالي الدسم', 'dairy', 59, 10.2, 3.6, 0.4, 0, 'container', 170, ['skyr', 'yaourt grec']],
  ['yogurt_plain_whole', 'Yogurt, plain, whole milk', 'Yaourt nature au lait entier', 'زبادي كامل الدسم', 'dairy', 61, 3.5, 4.7, 3.3, 0, 'pot', 125, ['yaourt', 'lben', 'رايب']],
  ['milk_whole', 'Milk, whole', 'Lait entier', 'حليب كامل الدسم', 'dairy', 61, 3.2, 4.8, 3.3, 0, 'cup', 244, ['lait', 'حليب']],
  ['milk_2pct', 'Milk, 2% fat', 'Lait demi-écrémé', 'حليب نصف دسم', 'dairy', 50, 3.3, 4.8, 2.0, 0, 'cup', 244, []],
  ['feta', 'Feta cheese', 'Feta', 'جبن فيتا', 'dairy', 264, 14.2, 4.1, 21.3, 0, 'portion', 28, ['feta']],
  ['cheddar', 'Cheddar cheese', 'Cheddar', 'جبن شيدر', 'dairy', 403, 24.9, 1.3, 33.1, 0, 'slice', 28, ['cheese', 'fromage']],
  ['mozzarella_part_skim', 'Mozzarella, part-skim', 'Mozzarella allégée', 'موزاريلا قليلة الدسم', 'dairy', 254, 24.3, 2.8, 15.9, 0, 'portion', 28, []],
  ['cottage_cheese_2', 'Cottage cheese, 2% fat', 'Fromage cottage 2 %', 'جبن قريش', 'dairy', 84, 11.0, 4.3, 2.3, 0, 'cup', 226, []],
  ['butter', 'Butter', 'Beurre', 'زبدة', 'fat', 717, 0.9, 0.1, 81.1, 0, 'tbsp', 14, ['beurre', 'smen']],

  // Fats, nuts, seeds
  ['olive_oil', 'Olive oil', 'Huile d\'olive', 'زيت الزيتون', 'fat', 884, 0, 0, 100, 0, 'tbsp', 13.5, ['oil', 'huile', 'زيت']],
  ['almonds', 'Almonds', 'Amandes', 'لوز', 'nut', 579, 21.2, 21.6, 49.9, 12.5, 'handful (23 nuts)', 28, ['amande']],
  ['walnuts', 'Walnuts', 'Noix', 'جوز', 'nut', 654, 15.2, 13.7, 65.2, 6.7, 'handful', 28, ['noix']],
  ['peanut_butter', 'Peanut butter, smooth', 'Beurre de cacahuète', 'زبدة الفول السوداني', 'nut', 588, 25.1, 20.0, 50.4, 6.0, 'tbsp', 16, []],
  ['tahini', 'Tahini (sesame paste)', 'Tahini (purée de sésame)', 'طحينة', 'nut', 595, 17.0, 21.2, 53.8, 9.3, 'tbsp', 15, ['tahina']],
  ['chia_seeds', 'Chia seeds', 'Graines de chia', 'بذور الشيا', 'nut', 486, 16.5, 42.1, 30.7, 34.4, 'tbsp', 12, []],
  ['mayonnaise', 'Mayonnaise', 'Mayonnaise', 'مايونيز', 'fat', 680, 1.0, 0.6, 75.0, 0, 'tbsp', 14, ['mayo']],

  // Sweets, condiments, spices, drinks
  ['honey', 'Honey', 'Miel', 'عسل', 'sweet', 304, 0.3, 82.4, 0, 0.2, 'tbsp', 21, ['miel']],
  ['sugar', 'Sugar, white', 'Sucre blanc', 'سكر', 'sweet', 387, 0, 100, 0, 0, 'tsp', 4, ['sucre']],
  ['dark_chocolate', 'Dark chocolate, 70–85% cacao', 'Chocolat noir 70–85 %', 'شوكولاتة داكنة', 'sweet', 598, 7.8, 45.9, 42.6, 10.9, 'square', 10, ['chocolate', 'chocolat']],
  ['ketchup', 'Ketchup', 'Ketchup', 'كاتشب', 'condiment', 101, 1.0, 27.4, 0.1, 0.3, 'tbsp', 17, []],
  ['cumin_ground', 'Cumin, ground', 'Cumin moulu', 'كمون مطحون', 'spice', 375, 17.8, 44.2, 22.3, 10.5, 'tsp', 2, ['cumin', 'كمون']],
  ['paprika', 'Paprika', 'Paprika', 'فلفل أحمر مطحون (بابريكا)', 'spice', 282, 14.1, 54.0, 12.9, 34.9, 'tsp', 2.3, ['red pepper powder', 'felfel ahmer']],
  ['orange_juice', 'Orange juice', 'Jus d\'orange', 'عصير برتقال', 'drink', 45, 0.7, 10.4, 0.2, 0.2, 'cup', 248, []],
  ['cola', 'Cola, regular', 'Soda au cola', 'مشروب غازي كولا', 'drink', 42, 0, 10.6, 0, 0, 'can (330 ml)', 345, ['soda', 'coca']],
  ['coffee_black', 'Coffee, black, brewed', 'Café noir', 'قهوة سوداء', 'drink', 1, 0.1, 0, 0, 0, 'cup', 240, ['café', 'قهوة']],
  ['tea_brewed', 'Tea, brewed, unsweetened', 'Thé infusé, sans sucre', 'شاي بدون سكر', 'drink', 1, 0, 0.3, 0, 0, 'cup', 240, ['thé', 'شاي']],
];
