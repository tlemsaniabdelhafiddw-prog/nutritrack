import { describe, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { mealAnalysisJsonSchema, parseMealAnalysis } from '@/lib/ai/schema';
import { bestMatch, matchScore } from '@/lib/ai/match-score';
import { AnthropicVisionProvider, mapAnthropicError } from '@/lib/ai/anthropic';
import { AiError } from '@/lib/ai/provider';
import { detectImageType } from '@/lib/images';
import { parseFdcFood } from '@/lib/food-sources/usda';

const validItem = {
  name: 'Grilled chicken',
  search_term: 'chicken breast, roasted',
  estimated_grams: 150,
  identification_confidence: 'high',
  portion_confidence: 'medium',
  kcal: 248,
  protein_g: 46.5,
  carbs_g: 0,
  fat_g: 5.4,
  fiber_g: 0,
  notes: null,
};

const validAnalysis = {
  is_food: true,
  meal_description: 'Grilled chicken with rice',
  items: [validItem],
  hidden_ingredients: ['olive oil'],
  clarifying_questions: ['Was the chicken cooked in oil?'],
  overall_confidence: 'medium',
  uncertainty_notice: 'Portions are estimated from the photo.',
};

describe('AI response schema', () => {
  it('accepts a well-formed analysis', () => {
    const r = parseMealAnalysis(validAnalysis);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it('rejects malformed output instead of guessing', () => {
    expect(parseMealAnalysis({ ...validAnalysis, items: [{ ...validItem, estimated_grams: -10 }] }).ok).toBe(false);
    expect(parseMealAnalysis({ ...validAnalysis, items: [{ ...validItem, identification_confidence: 'certain' }] }).ok).toBe(false);
    expect(parseMealAnalysis({ items: [] }).ok).toBe(false);
    expect(parseMealAnalysis('not json').ok).toBe(false);
    expect(parseMealAnalysis(null).ok).toBe(false);
  });

  it('flags items whose calories disagree with their macros', () => {
    const r = parseMealAnalysis({ ...validAnalysis, items: [{ ...validItem, kcal: 900 }] });
    expect(r.ok && r.warnings).toEqual([{ itemIndex: 0, code: 'energy_macro_mismatch' }]);
  });

  it('produces a JSON schema for the provider tool', () => {
    const schema = mealAnalysisJsonSchema();
    expect(schema.type).toBe('object');
    expect(schema).not.toHaveProperty('$schema');
    expect((schema.required as string[]).includes('items')).toBe(true);
  });
});

describe('food matching', () => {
  it('matches generic search terms to catalog names', () => {
    expect(matchScore('white rice, cooked', { name: 'Rice, white, long-grain, cooked' })).toBeGreaterThanOrEqual(0.6);
    expect(matchScore('olive oil', { name: 'Olive oil' })).toBe(1);
    expect(matchScore('lentils', { name: 'Lentils, boiled' })).toBeGreaterThanOrEqual(0.6);
  });

  it('does not force a match for unrelated foods', () => {
    expect(bestMatch('chocolate cake', [{ name: 'Carrot, raw' }, { name: 'Cabbage, raw' }])).toBeNull();
  });

  it('uses aliases', () => {
    expect(bestMatch('kesra', [{ name: 'Bread, semolina flatbread', aliases: ['kesra'] }])?.score).toBe(1);
  });
});

describe('vision provider failures', () => {
  it('maps SDK errors to typed, retry-aware errors', () => {
    expect(mapAnthropicError(new Anthropic.APIConnectionTimeoutError())).toMatchObject({ code: 'timeout', retryable: true });
    const rate = new Anthropic.RateLimitError(429, undefined, 'rate', new Headers());
    expect(mapAnthropicError(rate)).toMatchObject({ code: 'rate_limited', retryable: true });
    const auth = new Anthropic.AuthenticationError(401, undefined, 'auth', new Headers());
    expect(mapAnthropicError(auth)).toMatchObject({ code: 'not_configured', retryable: false });
    const server = new Anthropic.InternalServerError(500, undefined, 'boom', new Headers());
    expect(mapAnthropicError(server)).toMatchObject({ code: 'provider_error', retryable: true });
    expect(mapAnthropicError(new Error('x'))).toBeInstanceOf(AiError);
  });

  function providerReturning(create: () => Promise<unknown>) {
    const p = new AnthropicVisionProvider('test-key', 'test-model', 1000);
    // Replace the network call; everything after it (validation, mapping) runs for real.
    (p as unknown as { client: { messages: { create: unknown } } }).client = { messages: { create: vi.fn(create) } };
    return p;
  }

  const input = { image: { base64: 'AAAA', mediaType: 'image/jpeg' as const }, context: 'homemade' as const, hint: null, locale: 'en' as const };

  it('returns validated analysis from a tool call', async () => {
    const p = providerReturning(async () => ({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 't1', name: 'record_meal_analysis', input: validAnalysis }],
      usage: { input_tokens: 1200, output_tokens: 300 },
    }));
    const r = await p.analyzeMeal(input);
    expect(r.analysis.items[0].name).toBe('Grilled chicken');
    expect(r.usage).toEqual({ inputTokens: 1200, outputTokens: 300 });
  });

  it('throws invalid_output when the tool input is malformed', async () => {
    const p = providerReturning(async () => ({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 't1', name: 'record_meal_analysis', input: { items: 'oops' } }],
    }));
    await expect(p.analyzeMeal(input)).rejects.toMatchObject({ code: 'invalid_output' });
  });

  it('throws invalid_output when no tool call is returned', async () => {
    const p = providerReturning(async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Looks tasty!' }] }));
    await expect(p.analyzeMeal(input)).rejects.toMatchObject({ code: 'invalid_output' });
  });

  it('reports refusals and network failures without fabricating a result', async () => {
    await expect(providerReturning(async () => ({ stop_reason: 'refusal', content: [] })).analyzeMeal(input)).rejects.toMatchObject({ code: 'refused' });
    await expect(
      providerReturning(async () => {
        throw new Anthropic.APIConnectionTimeoutError();
      }).analyzeMeal(input),
    ).rejects.toMatchObject({ code: 'timeout' });
  });
});

describe('image validation', () => {
  it('detects formats from file signatures', () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe('image/png');
    const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
    expect(detectImageType(webp)).toBe('image/webp');
  });

  it('rejects other files even if renamed', () => {
    expect(detectImageType(new TextEncoder().encode('%PDF-1.7 fake image'))).toBeNull();
    expect(detectImageType(new TextEncoder().encode('GIF89a......'))).toBeNull();
    expect(detectImageType(new Uint8Array([1, 2]))).toBeNull();
  });
});

describe('USDA parsing', () => {
  it('reads energy and macros from search results', () => {
    const f = parseFdcFood({
      fdcId: 1,
      description: 'Lentils, mature seeds, cooked, boiled',
      dataType: 'SR Legacy',
      foodNutrients: [
        { nutrientId: 1008, unitName: 'KCAL', value: 116 },
        { nutrientId: 1003, unitName: 'G', value: 9.02 },
        { nutrientId: 1004, unitName: 'G', value: 0.38 },
        { nutrientId: 1005, unitName: 'G', value: 20.13 },
        { nutrientId: 1079, unitName: 'G', value: 7.9 },
      ],
    });
    expect(f?.per100).toEqual({ kcal_100g: 116, protein_100g: 9, carbs_100g: 20.1, fat_100g: 0.4, fiber_100g: 7.9 });
  });

  it('falls back to Atwater energy and skips incomplete records', () => {
    const f = parseFdcFood({
      fdcId: 2,
      description: 'Foundation food',
      foodNutrients: [
        { nutrient: { id: 2047, unitName: 'kcal' }, amount: 150 },
        { nutrient: { id: 1003 }, amount: 10 },
        { nutrient: { id: 1004 }, amount: 5 },
        { nutrient: { id: 1005 }, amount: 15 },
      ],
    });
    expect(f?.per100.kcal_100g).toBe(150);
    expect(parseFdcFood({ fdcId: 3, description: 'x', foodNutrients: [{ nutrientId: 1003, value: 1 }] })).toBeNull();
  });
});
