import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client.
 *
 * Uses the service role, so it bypasses RLS — every table's policies are
 * deny-by-default and authorization is enforced in lib/permissions.ts. The key
 * is read from the environment and must never be exposed to the browser, so
 * this module is imported only from server code.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, ' +
        'or set DATABASE_DRIVER=local to use the JSON store.'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  });
  return cached;
}

/** Throws on a query error so a failure never looks like "no rows". */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) throw new Error(`[supabase] ${context}: ${result.error.message}`);
  return result.data as T;
}

/** Same, but a missing row is a legitimate null. */
export function unwrapMaybe<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  context: string
): T | null {
  if (result.error) {
    if (result.error.code === 'PGRST116') return null; // no rows from .single()
    throw new Error(`[supabase] ${context}: ${result.error.message}`);
  }
  return result.data;
}
