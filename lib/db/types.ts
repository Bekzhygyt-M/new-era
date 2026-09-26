import type { localDb } from '@/lib/local-db';

/**
 * The data layer contract (TZ §28).
 *
 * Every storage backend must expose the same operations. The interface is
 * derived from the existing local store rather than restated by hand, so an
 * adapter can never drift from the operations the application actually calls.
 *
 * Everything is async: PostgreSQL is a network hop, and Vercel's filesystem is
 * ephemeral, so the JSON store cannot be the production backend.
 */
type Asyncified<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : T[K];
};

export type Database = Asyncified<typeof localDb>;

export type DatabaseDriver = 'local' | 'supabase';
