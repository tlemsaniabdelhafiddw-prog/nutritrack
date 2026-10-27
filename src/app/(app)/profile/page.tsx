import { requireAppUser } from '@/lib/server/profile';
import { getT } from '@/i18n/server';
import { kgToLb } from '@/lib/nutrition/portions';
import { Card, PageHeader } from '@/components/ui/surface';
import { ProfileSettings } from '@/components/profile/profile-client';
import { isLocale } from '@/i18n/config';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const app = await requireAppUser();
  const t = await getT();
  const p = app.profile;
  const imperial = p.units === 'imperial';
  const w = (kg: number | null) => (kg === null ? '—' : `${t.num(imperial ? kgToLb(Number(kg)) : Number(kg), 1)} ${imperial ? t('common.lb') : t('common.kg')}`);

  const details: [string, string][] = [
    [t('onboarding.displayName'), p.display_name ?? '—'],
    [t('onboarding.dateOfBirth'), p.date_of_birth ? t.date(p.date_of_birth, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
    [t('onboarding.height'), p.height_cm ? `${t.num(Number(p.height_cm))} ${t('common.cm')}` : '—'],
    [t('onboarding.weight'), w(p.weight_kg)],
    [t('onboarding.activity'), p.activity_level ? t(`activity.${p.activity_level as 'light'}`) : '—'],
    [t('onboarding.goalLabel'), p.goal ? t(`goal.${p.goal as 'maintain'}`) : '—'],
    [t('profile.timezone'), p.timezone],
  ];

  return (
    <div className="max-w-3xl">
      <PageHeader title={t('profile.title')} lead={t('profile.signedInAs', { email: app.user.email ?? '' })} />
      <div className="grid gap-6">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t('profile.personal')}</h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {details.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ink-soft">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t('profile.targets')}</h2>
          {app.targets ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  [t('targets.calories'), `${t.num(app.targets.calories)} ${t('common.kcal')}`],
                  [t('targets.protein'), `${t.num(Number(app.targets.protein_g))} g`],
                  [t('targets.carbs'), `${t.num(Number(app.targets.carbs_g))} g`],
                  [t('targets.fat'), `${t.num(Number(app.targets.fat_g))} g`],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-blush-deep/70 px-4 py-3">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="font-display text-lg font-semibold tabular">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-ink-soft">{t('targets.none')}</p>
          )}
          <p className="mt-4 text-xs text-ink-soft">{t('common.medicalDisclaimer')}</p>
        </Card>

        <ProfileSettings
          consentAt={p.ai_photo_consent_at}
          profile={{
            display_name: p.display_name,
            date_of_birth: p.date_of_birth,
            sex: p.sex,
            height_cm: Number(p.height_cm),
            weight_kg: Number(p.weight_kg),
            target_weight_kg: p.target_weight_kg === null ? null : Number(p.target_weight_kg),
            activity_level: p.activity_level,
            goal: p.goal,
            units: p.units,
            locale: isLocale(p.locale) ? p.locale : 'en',
            timezone: p.timezone,
          }}
        />
      </div>
    </div>
  );
}
