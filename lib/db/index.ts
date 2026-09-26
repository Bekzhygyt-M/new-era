import { localAdapter } from '@/lib/db/local';
import { supabaseAdapter } from '@/lib/db/supabase';
import type { Database, DatabaseDriver } from '@/lib/db/types';

export type { Database, DatabaseDriver };

/**
 * Active data layer.
 *
 * DATABASE_DRIVER selects the backend; it defaults to 'supabase' whenever a
 * service-role key is configured, so a production deployment cannot silently
 * fall back to the JSON file — which does not survive a serverless redeploy.
 */
function resolveDriver(): DatabaseDriver {
  const explicit = process.env.DATABASE_DRIVER;
  if (explicit === 'local' || explicit === 'supabase') return explicit;
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local';
}

export const databaseDriver: DatabaseDriver = resolveDriver();

export const db: Database = databaseDriver === 'supabase' ? supabaseAdapter : localAdapter;
