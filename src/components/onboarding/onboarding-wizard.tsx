'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { api, errorMessage } from '@/lib/client/api';
import { ageFromDateOfBirth, buildNutritionPlan, type ActivityLevel, type Goal, type Sex } from '@/lib/nutrition/calc';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '@/lib/nutrition/portions';
import { ALLERGENS, DIETARY_PREFERENCES } from '@/lib/validation';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config';
import { Button } from '../ui/button';
import { Field, Input, Select, Textarea, parseDecimal } from '../ui/field';
import { ChipGroup, ChoiceGroup } from '../ui/choice';
import { Card, Notice } from '../ui/surface';
import { TargetsEditor, draftFrom, parseDraft, targetsValid, type TargetDraft } from './targets-editor';
import { PlanFacts } from '../calculator/plan-facts';

type Units = 'metric' | 'imperial';

export type OnboardingInitial = {
  display_name: string;
  date_of_birth: string;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  units: Units;
  locale: Locale;
  dietary_preferences: string[];
  allergies: string[];
  restrictions_note: string;
};

const STEPS = 5;

export function OnboardingWizard({ initial, today }: { initial: OnboardingInitial; today: string }) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initial.display_name);
  const [dob, setDob] = useState(initial.date_of_birth);
  const [sex, setSex] = useState<Sex | null>(initial.sex);
  const [units, setUnits] = useState<Units>(initial.units);
  const [heightCm, setHeightCm] = useState(initial.height_cm ? String(initial.height_cm) : '');
  const [ft, setFt] = useState(initial.height_cm ? String(cmToFtIn(initial.height_cm).ft) : '');
  const [inch, setInch] = useState(initial.height_cm ? String(cmToFtIn(initial.height_cm).inches) : '');
  const [weight, setWeight] = useState(initial.weight_kg ? String(initial.units === 'imperial' ? kgToLb(initial.weight_kg) : initial.weight_kg) : '');
  const [targetWeight, setTargetWeight] = useState(initial.target_weight_kg ? String(initial.units === 'imperial' ? kgToLb(initial.target_weight_kg) : initial.target_weight_kg) : '');
  const [activity, setActivity] = useState<ActivityLevel | null>(initial.activity_level);
  const [goal, setGoal] = useState<Goal | null>(initial.goal);
  const [diet, setDiet] = useState<string[]>(initial.dietary_preferences);
  const [allergies, setAllergies] = useState<string[]>(initial.allergies);
  const [note, setNote] = useState(initial.restrictions_note);
  const [locale, setLocale] = useState<Locale>(initial.locale);
  const [draft, setDraft] = useState<TargetDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const age = dob ? ageFromDateOfBirth(dob, new Date(`${today}T12:00:00Z`)) : NaN;
  const isMinor = Number.isFinite(age) && age < 18;
  const heightValue = units === 'metric' ? parseDecimal(heightCm) : (() => {
    const f = parseDecimal(ft);
    const i = parseDecimal(inch) ?? 0;
    return f === null ? null : ftInToCm(f, i);
  })();
  const weightKg = (() => {
    const w = parseDecimal(weight);
    return w === null ? null : units === 'metric' ? w : lbToKg(w);
  })();
  const targetKg = (() => {
    const w = parseDecimal(targetWeight);
    return w === null ? null : units === 'metric' ? w : lbToKg(w);
  })();

  const plan = useMemo(() => {
    if (!sex || !activity || !goal || heightValue === null || weightKg === null || !Number.isFinite(age)) return null;
    return buildNutritionPlan({ ageYears: age, sex, heightCm: heightValue, weightKg, activity, goal: isMinor ? 'maintain' : goal });
  }, [sex, activity, goal, heightValue, weightKg, age, isMinor]);

  function validate(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!name.trim()) e.name = t('common.errorValidation');
      if (!dob || !Number.isFinite(age) || age < 2 || age > 110 || dob > today) e.dob = t('calculator.invalid_age_out_of_range');
      if (!sex) e.sex = t('common.errorValidation');
    }
    if (s === 2) {
      if (heightValue === null || heightValue < 120 || heightValue > 230) e.height = t('calculator.invalid_height_out_of_range');
      if (weightKg === null || weightKg < 30 || weightKg > 300) e.weight = t('calculator.invalid_weight_out_of_range');
      if (targetKg !== null && (targetKg < 30 || targetKg > 300)) e.targetWeight = t('calculator.invalid_weight_out_of_range');
    }
    if (s === 3) {
      if (!activity) e.activity = t('common.errorValidation');
      if (!goal && !isMinor) e.goal = t('common.errorValidation');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate(step)) return;
    if (step === 4 && plan?.status === 'ok') setDraft(draftFrom(plan.targets));
    setStep((s) => Math.min(STEPS, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function finish() {
    setSaving(true);
    setSaveError(null);
    const parsed = draft ? parseDraft(draft) : null;
    const suggested = plan?.status === 'ok' ? plan.targets : null;
    const custom = Boolean(parsed && suggested && (parsed.calories !== suggested.calories || parsed.protein_g !== suggested.protein_g || parsed.carbs_g !== suggested.carbs_g || parsed.fat_g !== suggested.fat_g));
    try {
      await api('/api/onboarding', {
        json: {
          profile: {
            display_name: name.trim(),
            date_of_birth: dob,
            sex,
            height_cm: Math.round(heightValue! * 10) / 10,
            weight_kg: Math.round(weightKg! * 10) / 10,
            target_weight_kg: targetKg === null ? null : Math.round(targetKg * 10) / 10,
            activity_level: activity,
            goal: isMinor ? 'maintain' : plan?.status === 'ok' ? plan.inputs.goal : goal,
            units,
            locale,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          },
          preferences: { dietary_preferences: diet, allergies, restrictions_note: note.trim() || null, water_goal_ml: 2000, keep_meal_photos: true },
          targets: isMinor || !parsed ? null : { ...parsed, is_custom: custom },
        },
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setSaveError(errorMessage(t, err));
      setSaving(false);
    }
  }

  const canFinish = isMinor || (draft !== null && targetsValid(draft) && plan?.status === 'ok');

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-ink-soft">{t('onboarding.stepOf', { current: step, total: STEPS })}</p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-rose' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <Card className="p-5 sm:p-7">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-semibold">{t('onboarding.aboutYou')}</h2>
            <p className="text-ink-soft">{t('onboarding.aboutYouLead')}</p>
            <Field label={t('onboarding.displayName')} error={errors.name}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="given-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label={t('onboarding.dateOfBirth')} error={errors.dob}>
              {({ id, describedBy, invalid }) => <Input id={id} type="date" max={today} aria-describedby={describedBy} aria-invalid={invalid} value={dob} onChange={(e) => setDob(e.target.value)} />}
            </Field>
            <div>
              <ChoiceGroup<Sex>
                legend={t('onboarding.sexLabel')}
                value={sex}
                onChange={setSex}
                options={[
                  { value: 'female', label: t('onboarding.female') },
                  { value: 'male', label: t('onboarding.male') },
                ]}
              />
              <p className="mt-1.5 text-xs text-ink-soft">{t('onboarding.sexHint')}</p>
              {errors.sex && <p className="mt-1 text-xs font-medium text-danger">{errors.sex}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-semibold">{t('onboarding.body')}</h2>
            <ChoiceGroup<Units>
              legend={t('onboarding.unitsLabel')}
              layout="segmented"
              value={units}
              onChange={(u) => {
                if (u === units) return;
                if (heightValue !== null) {
                  const fi = cmToFtIn(heightValue);
                  setFt(String(fi.ft));
                  setInch(String(fi.inches));
                  setHeightCm(String(Math.round(heightValue)));
                }
                if (weightKg !== null) setWeight(String(u === 'imperial' ? kgToLb(weightKg) : Math.round(weightKg * 10) / 10));
                if (targetKg !== null) setTargetWeight(String(u === 'imperial' ? kgToLb(targetKg) : Math.round(targetKg * 10) / 10));
                setUnits(u);
              }}
              options={[
                { value: 'metric', label: t('onboarding.metric') },
                { value: 'imperial', label: t('onboarding.imperial') },
              ]}
            />
            {units === 'metric' ? (
              <Field label={`${t('onboarding.height')} (${t('common.cm')})`} error={errors.height}>
                {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" className="tabular" aria-describedby={describedBy} aria-invalid={invalid} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />}
              </Field>
            ) : (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{t('onboarding.height')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('onboarding.feet')}>{({ id }) => <Input id={id} inputMode="numeric" className="tabular" value={ft} onChange={(e) => setFt(e.target.value)} />}</Field>
                  <Field label={t('onboarding.inches')}>{({ id }) => <Input id={id} inputMode="numeric" className="tabular" value={inch} onChange={(e) => setInch(e.target.value)} />}</Field>
                </div>
                {errors.height && <p className="mt-1 text-xs font-medium text-danger">{errors.height}</p>}
              </fieldset>
            )}
            <Field label={`${t('onboarding.weight')} (${units === 'metric' ? t('common.kg') : t('common.lb')})`} error={errors.weight}>
              {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" className="tabular" aria-describedby={describedBy} aria-invalid={invalid} value={weight} onChange={(e) => setWeight(e.target.value)} />}
            </Field>
            {!isMinor && (
              <Field label={`${t('onboarding.targetWeight')} (${units === 'metric' ? t('common.kg') : t('common.lb')})`} optional={t('common.optional')} error={errors.targetWeight}>
                {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" className="tabular" aria-describedby={describedBy} aria-invalid={invalid} value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />}
              </Field>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-semibold">{t('onboarding.activityTitle')}</h2>
            <ChoiceGroup<ActivityLevel>
              legend={t('onboarding.activity')}
              value={activity}
              onChange={setActivity}
              options={(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map((a) => ({ value: a, label: t(`activity.${a}`), hint: t(`activity.${a}Hint`) }))}
            />
            {errors.activity && <p className="text-xs font-medium text-danger">{errors.activity}</p>}
            {isMinor ? (
              <Notice>
                <p className="font-medium">{t('onboarding.minorTitle')}</p>
                <p className="mt-1">{t('onboarding.minorBody')}</p>
              </Notice>
            ) : (
              <>
                <ChoiceGroup<Goal>
                  legend={t('onboarding.goalLabel')}
                  value={goal}
                  onChange={setGoal}
                  options={(['maintain', 'lose', 'gain'] as const).map((g) => ({ value: g, label: t(`goal.${g}`) }))}
                />
                {errors.goal && <p className="text-xs font-medium text-danger">{errors.goal}</p>}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-semibold">{t('onboarding.preferencesTitle')}</h2>
            <p className="text-ink-soft">{t('onboarding.preferencesLead')}</p>
            <ChipGroup legend={t('onboarding.dietary')} values={diet} onChange={setDiet} options={DIETARY_PREFERENCES.map((d) => ({ value: d, label: t(`diet.${d}`) }))} />
            <ChipGroup legend={t('onboarding.allergies')} values={allergies} onChange={setAllergies} options={ALLERGENS.map((a) => ({ value: a, label: t(`allergen.${a}`) }))} />
            <Field label={t('onboarding.restrictionsNote')} optional={t('common.optional')}>
              {({ id }) => <Textarea id={id} value={note} maxLength={500} placeholder={t('onboarding.restrictionsPlaceholder')} onChange={(e) => setNote(e.target.value)} />}
            </Field>
            <Field label={t('onboarding.language')}>
              {({ id }) => (
                <Select id={id} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {LOCALE_NAMES[l]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-semibold">{isMinor ? t('onboarding.minorTitle') : t('onboarding.reviewTitle')}</h2>
            {isMinor ? (
              <Notice>{t('onboarding.minorBody')}</Notice>
            ) : plan?.status === 'ok' && draft ? (
              <>
                <p className="text-ink-soft">{t('onboarding.reviewLead')}</p>
                <PlanFacts plan={plan} />
                {plan.notes.includes('bmi_low_no_deficit') && <Notice tone="warn">{t('onboarding.lowBmiNote')}</Notice>}
                {plan.notes.includes('floor_applied') && <Notice tone="warn">{t('onboarding.floorNote')}</Notice>}
                <TargetsEditor draft={draft} onChange={setDraft} />
              </>
            ) : (
              <Notice tone="error">{t('common.errorValidation')}</Notice>
            )}
            <p className="text-xs text-ink-soft">{t('common.medicalDisclaimer')}</p>
            {saveError && <Notice tone="error">{saveError}</Notice>}
          </div>
        )}

        <div className="mt-8 flex justify-between gap-3">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              {t('common.back')}
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS ? (
            <Button onClick={next}>{t('common.next')}</Button>
          ) : (
            <Button onClick={finish} loading={saving} disabled={!canFinish}>
              {saving ? t('onboarding.finishing') : t('onboarding.finish')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
