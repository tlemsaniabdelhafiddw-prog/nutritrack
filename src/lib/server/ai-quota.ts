import 'server-only';
import type { ServerSupabase } from '../supabase/server';
import { serverEnv } from '../env';

/** Per-user hourly and daily caps on AI analyses, counted from the ai_requests log. */
export async function checkAiQuota(supabase: ServerSupabase, userId: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const hourAgo = new Date(now - 3600_000).toISOString();
  const dayAgo = new Date(now - 86400_000).toISOString();
  const [hour, day] = await Promise.all([
    supabase.from('ai_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', hourAgo),
    supabase.from('ai_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', dayAgo),
  ]);
  if ((day.count ?? 0) >= serverEnv.aiDailyLimit) return { allowed: false, retryAfterSeconds: 3600 * 6 };
  if ((hour.count ?? 0) >= serverEnv.aiHourlyLimit) return { allowed: false, retryAfterSeconds: 900 };
  return { allowed: true, retryAfterSeconds: 0 };
}
