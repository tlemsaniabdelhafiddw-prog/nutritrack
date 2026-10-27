'use client';

import { useT } from '@/i18n/client';
import type { NutritionPlan } from '@/lib/nutrition/calc';

/** BMI, BMR and TDEE summary for a computed plan. */
export function PlanFacts({ plan }: { plan: Extract<NutritionPlan, { status: 'ok' }> }) {
  const t = useT();
  const facts = [
    { label: t('targets.bmi'), value: t.num(plan.bmi, 1), sub: plan.bmiCategory ? t(`calculator.bmi_${plan.bmiCategory}`) : null },
    { label: t('targets.bmr'), value: `${t.num(plan.bmr)} ${t('common.kcal')}`, sub: null },
    { label: t('targets.tdee'), value: `${t.num(plan.tdee)} ${t('common.kcal')}`, sub: null },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {facts.map((f) => (
        <div key={f.label} className="rounded-2xl bg-blush-deep/70 px-4 py-3">
          <dt className="text-xs text-ink-soft">{f.label}</dt>
          <dd className="font-display text-xl font-semibold tabular">{f.value}</dd>
          {f.sub && <dd className="text-xs text-ink-soft">{f.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
