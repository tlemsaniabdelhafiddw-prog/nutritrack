import type { MealAnalysis, AnalysisWarning } from './schema';

/**
 * Vision provider abstraction. Swap the model or vendor by adding another
 * implementation of this interface and selecting it in getVisionProvider().
 */

export type MealContext = 'homemade' | 'restaurant' | 'packaged' | 'unknown';

export type AnalyzeMealInput = {
  image: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' };
  context: MealContext;
  hint: string | null;
  /** Language for food names and questions. */
  locale: 'en' | 'fr' | 'ar';
};

export type AnalyzeMealResult = {
  analysis: MealAnalysis;
  warnings: AnalysisWarning[];
  usage: { inputTokens: number | null; outputTokens: number | null };
};

export type AiErrorCode = 'not_configured' | 'timeout' | 'rate_limited' | 'provider_error' | 'invalid_output' | 'refused';

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    public retryable: boolean,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface VisionProvider {
  readonly name: string;
  readonly model: string;
  analyzeMeal(input: AnalyzeMealInput): Promise<AnalyzeMealResult>;
}
