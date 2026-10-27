import { requireAppUser } from '@/lib/server/profile';
import { isAiConfigured } from '@/lib/env';
import { localDateFor, localTimeFor } from '@/lib/dates';
import { getT } from '@/i18n/server';
import { PageHeader } from '@/components/ui/surface';
import { ScanFlow } from '@/components/scan/scan-flow';

export const metadata = { title: 'Scan a meal' };

export default async function ScanPage() {
  const app = await requireAppUser();
  const t = await getT();
  const now = new Date();
  const time = localTimeFor(now, app.timeZone);
  const hour = Number(time.slice(0, 2));
  const category = hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 21 ? 'dinner' : 'snack';
  return (
    <div>
      <PageHeader title={t('scan.title')} lead={t('scan.lead')} />
      <ScanFlow
        userId={app.user.id}
        aiConfigured={isAiConfigured()}
        hasConsent={Boolean(app.profile.ai_photo_consent_at)}
        keepPhotosDefault={app.preferences.keep_meal_photos}
        defaults={{ date: localDateFor(now, app.timeZone), time, category }}
      />
    </div>
  );
}
