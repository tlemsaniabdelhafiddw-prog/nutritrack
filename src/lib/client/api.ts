'use client';

import type { Translator } from '@/i18n/translate';

export class ClientApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

type Options = { method?: string; json?: unknown; form?: FormData; signal?: AbortSignal };

/** Fetch wrapper for the app's own API routes. Throws ClientApiError with the server's error code. */
export async function api<T = unknown>(url: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.json || opts.form ? 'POST' : 'GET'),
      headers: opts.json !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
      signal: opts.signal,
      credentials: 'same-origin',
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ClientApiError(0, 'network');
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; details?: unknown };
    throw new ClientApiError(res.status, b.error ?? 'server_error', b.details);
  }
  return body as T;
}

/** Human message for an error, in the current language. */
export function errorMessage(t: Translator, err: unknown): string {
  if (!(err instanceof ClientApiError)) return t('common.errorGeneric');
  switch (err.code) {
    case 'network':
      return t('common.errorNetwork');
    case 'unauthorized':
      return t('common.errorUnauthorized');
    case 'invalid_input':
      return t('common.errorValidation');
    case 'database_error':
      return t('common.errorDatabase');
    case 'rate_limited':
      return t('common.errorRateLimited');
    case 'ai_not_configured':
      return t('scan.notConfigured');
    case 'ai_timeout':
      return t('scan.timeout');
    case 'ai_rate_limited':
      return t('scan.providerError');
    case 'ai_provider_error':
      return (err.details as { reason?: string } | undefined)?.reason === 'refused' ? t('scan.refused') : t('scan.providerError');
    case 'ai_invalid_output':
      return t('scan.invalidOutput');
    case 'ai_not_food':
      return t('scan.notFood');
    case 'consent_required':
      return t('scan.consentRequired');
    case 'payload_too_large':
      return t('scan.fileTooLarge');
    case 'unsupported_media_type':
      return t('scan.fileType');
    default:
      return t('common.errorGeneric');
  }
}

export function newRequestId(): string {
  return crypto.randomUUID();
}
