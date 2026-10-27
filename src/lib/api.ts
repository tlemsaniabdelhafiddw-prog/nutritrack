import 'server-only';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { getCurrentUser } from './supabase/server';

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'conflict'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'rate_limited'
  | 'ai_not_configured'
  | 'ai_timeout'
  | 'ai_rate_limited'
  | 'ai_provider_error'
  | 'ai_invalid_output'
  | 'ai_not_food'
  | 'consent_required'
  | 'onboarding_required'
  | 'external_service_unavailable'
  | 'database_error'
  | 'server_error';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    public details?: unknown,
  ) {
    super(code);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function errorResponse(status: number, code: ApiErrorCode, details?: unknown) {
  return NextResponse.json({ error: code, ...(details ? { details } : {}) }, { status });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with consistent error responses. Never echoes internal errors. */
export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err.status, err.code, err.details);
      if (err instanceof ZodError) {
        return errorResponse(400, 'invalid_input', err.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })));
      }
      console.error('[api] unhandled error', err instanceof Error ? err.message : 'unknown');
      return errorResponse(500, 'server_error');
    }
  };
}

export async function requireUser() {
  const { supabase, user } = await getCurrentUser();
  if (!user) throw new ApiError(401, 'unauthorized');
  return { supabase, user };
}

export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'invalid_input', [{ path: '', message: 'invalid_json' }]);
  }
  return schema.parse(body);
}

/** Throws a database_error for unexpected Postgres errors without leaking details. */
export function dbCheck<T>(res: { data: T; error: { code?: string; message: string } | null }, context: string): T {
  if (res.error) {
    console.error(`[db] ${context}:`, res.error.code ?? '', res.error.message);
    throw new ApiError(500, 'database_error');
  }
  return res.data;
}

/** Like dbCheck, for single-row queries that must return a row. */
export function dbOne<T>(res: { data: T | null; error: { code?: string; message: string } | null }, context: string): NonNullable<T> {
  const data = dbCheck(res, context);
  if (data === null || data === undefined) {
    console.error(`[db] ${context}: no row returned`);
    throw new ApiError(500, 'database_error');
  }
  return data as NonNullable<T>;
}
