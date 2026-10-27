import { ApiError, ok, requireUser, route } from '@/lib/api';
import { isAiConfigured } from '@/lib/env';
import { getVisionProvider } from '@/lib/ai';
import { AiError, type MealContext } from '@/lib/ai/provider';
import { detectImageType, MAX_ANALYZE_BYTES } from '@/lib/images';
import { checkAiQuota } from '@/lib/server/ai-quota';
import { matchAnalysisToFoods } from '@/lib/server/food-matching';
import { isLocale } from '@/i18n/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CONTEXTS: MealContext[] = ['homemade', 'restaurant', 'packaged', 'unknown'];

const AI_ERROR_MAP: Record<AiError['code'], { status: number; code: ConstructorParameters<typeof ApiError>[1] }> = {
  not_configured: { status: 503, code: 'ai_not_configured' },
  timeout: { status: 504, code: 'ai_timeout' },
  rate_limited: { status: 429, code: 'ai_rate_limited' },
  provider_error: { status: 502, code: 'ai_provider_error' },
  invalid_output: { status: 502, code: 'ai_invalid_output' },
  refused: { status: 422, code: 'ai_provider_error' },
};

/**
 * Analyzes a meal photo. The image is validated by signature and size, sent to the configured
 * vision provider, and the structured result is validated before it reaches the client.
 * Failures are reported as errors; no substitute result is ever returned.
 */
export const POST = route(async (req) => {
  const { supabase, user } = await requireUser();
  if (!isAiConfigured()) throw new ApiError(503, 'ai_not_configured');

  const { data: profile } = await supabase.from('profiles').select('ai_photo_consent_at, locale').eq('id', user.id).maybeSingle();
  if (!profile?.ai_photo_consent_at) throw new ApiError(403, 'consent_required');

  const declaredLength = Number(req.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_ANALYZE_BYTES + 64 * 1024) throw new ApiError(413, 'payload_too_large');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, 'invalid_input', [{ path: 'image', message: 'multipart_required' }]);
  }
  const file = form.get('image');
  if (!(file instanceof File)) throw new ApiError(400, 'invalid_input', [{ path: 'image', message: 'missing' }]);
  if (file.size > MAX_ANALYZE_BYTES) throw new ApiError(413, 'payload_too_large');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = detectImageType(bytes);
  if (!mediaType) throw new ApiError(415, 'unsupported_media_type');

  const rawContext = String(form.get('context') ?? 'unknown');
  const context = (CONTEXTS as string[]).includes(rawContext) ? (rawContext as MealContext) : 'unknown';
  const hint = String(form.get('hint') ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, 300);
  const locale = isLocale(profile.locale) ? profile.locale : 'en';

  const quota = await checkAiQuota(supabase, user.id);
  if (!quota.allowed) throw new ApiError(429, 'rate_limited', { retryAfterSeconds: quota.retryAfterSeconds });

  const provider = getVisionProvider();
  const log = await supabase
    .from('ai_requests')
    .insert({ user_id: user.id, provider: provider.name, model: provider.model, status: 'started' })
    .select('id')
    .single();
  const logId = log.data?.id;

  try {
    const result = await provider.analyzeMeal({
      image: { base64: Buffer.from(bytes).toString('base64'), mediaType },
      context,
      hint: hint || null,
      locale,
    });
    if (logId) {
      await supabase
        .from('ai_requests')
        .update({ status: 'succeeded', input_tokens: result.usage.inputTokens, output_tokens: result.usage.outputTokens })
        .eq('id', logId);
    }

    if (!result.analysis.is_food || result.analysis.items.length === 0) {
      throw new ApiError(422, 'ai_not_food', { description: result.analysis.meal_description });
    }

    const items = await matchAnalysisToFoods(supabase, result.analysis, result.warnings);
    return ok({
      provider: provider.name,
      model: provider.model,
      analysis: result.analysis,
      items,
    });
  } catch (err) {
    if (err instanceof AiError) {
      if (logId) await supabase.from('ai_requests').update({ status: 'failed', error_code: err.code }).eq('id', logId);
      const mapped = AI_ERROR_MAP[err.code];
      throw new ApiError(mapped.status, mapped.code, { retryable: err.retryable, reason: err.code });
    }
    throw err;
  }
});
