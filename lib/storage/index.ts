import { localStorage as localDriver } from '@/lib/storage/local';
import { supabaseStorage } from '@/lib/storage/supabase';
import type { StorageDriver } from '@/lib/storage/types';

export type { StorageDriver, StoredObject, ReadableObject } from '@/lib/storage/types';

/** Bucket names, shared by both backends. */
export const BUCKETS = {
  video: 'videos',
  receipt: 'receipts',
  image: 'images',
} as const;

/**
 * Storage follows the data layer: STORAGE_DRIVER wins, otherwise Supabase
 * whenever a service-role key exists, so a serverless deployment never writes
 * uploads to a disk that disappears.
 */
function resolveDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === 'local') return localDriver;
  if (explicit === 'supabase') return supabaseStorage;
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseStorage : localDriver;
}

export const storage: StorageDriver = resolveDriver();
