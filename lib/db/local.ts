import { localDb } from '@/lib/local-db';
import type { Database } from '@/lib/db/types';

/**
 * JSON-file backend.
 *
 * Suitable for local development and the test suite. Not for production on a
 * serverless host: the filesystem is per-instance and wiped on redeploy.
 */
export const localAdapter: Database = new Proxy({} as Database, {
  get(_target, property) {
    const value = (localDb as unknown as Record<string | symbol, unknown>)[property];
    if (typeof value !== 'function') return value;

    return (...args: unknown[]) => {
      try {
        return Promise.resolve((value as (...a: unknown[]) => unknown).apply(localDb, args));
      } catch (error) {
        return Promise.reject(error);
      }
    };
  },
});
