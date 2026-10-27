import { cookies } from 'next/headers';
import { z } from 'zod';
import { ok, readJson, route } from '@/lib/api';
import { LOCALE_COOKIE } from '@/i18n/config';
import { locale } from '@/lib/validation';

/** Sets the interface language for signed-out visitors (signed-in users save it in their profile). */
export const POST = route(async (req) => {
  const body = await readJson(req, z.object({ locale }));
  (await cookies()).set(LOCALE_COOKIE, body.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return ok({ locale: body.locale });
});
