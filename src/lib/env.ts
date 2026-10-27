import 'server-only';

/** Server-side configuration. Secrets never leave the server. */

function num(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  aiProvider: (process.env.AI_PROVIDER ?? 'anthropic') as 'anthropic',
  aiModel: process.env.AI_VISION_MODEL || 'claude-sonnet-5-5',
  aiTimeoutMs: num('AI_TIMEOUT_MS', 45000),
  aiHourlyLimit: num('AI_HOURLY_LIMIT', 15),
  aiDailyLimit: num('AI_DAILY_LIMIT', 40),
  fdcApiKey: process.env.FDC_API_KEY ?? '',
};

export const isAiConfigured = () => Boolean(serverEnv.anthropicApiKey);
export const isUsdaConfigured = () => Boolean(serverEnv.fdcApiKey);
