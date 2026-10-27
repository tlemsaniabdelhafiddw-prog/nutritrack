import 'server-only';
import { serverEnv } from '../env';
import { AiError, type VisionProvider } from './provider';
import { AnthropicVisionProvider } from './anthropic';

let cached: VisionProvider | null = null;

/** Returns the configured vision provider or throws AiError('not_configured'). */
export function getVisionProvider(): VisionProvider {
  if (cached) return cached;
  switch (serverEnv.aiProvider) {
    case 'anthropic':
    default:
      if (!serverEnv.anthropicApiKey) throw new AiError('not_configured', false);
      cached = new AnthropicVisionProvider(serverEnv.anthropicApiKey, serverEnv.aiModel, serverEnv.aiTimeoutMs);
      return cached;
  }
}
