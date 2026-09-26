import { supabaseAdmin } from '@/lib/db/supabase-client';
import type { ReadableObject, StorageDriver } from '@/lib/storage/types';

/**
 * Supabase Storage backend.
 *
 * Buckets are private (created by supabase/schema.sql), so an object is
 * reachable only via the service role or a short-lived signed URL that the
 * app issues *after* checking access (TZ §12).
 */
export const supabaseStorage: StorageDriver = {
  name: 'supabase',

  async put(bucket, objectPath, bytes, contentType) {
    const { error } = await supabaseAdmin()
      .storage.from(bucket)
      .upload(objectPath, bytes, { contentType, upsert: true });
    if (error) throw new Error(`[storage] upload ${bucket}/${objectPath}: ${error.message}`);
  },

  async size(bucket, objectPath) {
    const slash = objectPath.lastIndexOf('/');
    const folder = slash > 0 ? objectPath.slice(0, slash) : '';
    const name = slash > 0 ? objectPath.slice(slash + 1) : objectPath;

    const { data, error } = await supabaseAdmin().storage.from(bucket).list(folder, { search: name });
    if (error) throw new Error(`[storage] stat ${bucket}/${objectPath}: ${error.message}`);

    const entry = data?.find((f) => f.name === name);
    const size = entry?.metadata?.size;
    return typeof size === 'number' ? size : null;
  },

  async read(bucket, objectPath, start, end): Promise<ReadableObject | null> {
    // The JS client cannot request a byte range, so go through the REST
    // endpoint directly with the service key.
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error('[storage] Supabase is not configured');

    const headers: Record<string, string> = {
      apikey: key,
      Authorization: `Bearer ${key}`,
    };
    if (start !== undefined) headers.Range = `bytes=${start}-${end ?? ''}`;

    const response = await fetch(
      `${base}/storage/v1/object/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
      { headers, cache: 'no-store' }
    );

    if (response.status === 404) return null;
    if (!response.ok && response.status !== 206) {
      throw new Error(`[storage] read ${bucket}/${objectPath}: HTTP ${response.status}`);
    }
    if (!response.body) return null;

    // On a 206 the total size is the third part of `bytes start-end/total`.
    const contentRange = response.headers.get('content-range');
    const total = contentRange
      ? Number(contentRange.split('/')[1])
      : Number(response.headers.get('content-length') || 0);

    return {
      stream: response.body,
      size: Number.isFinite(total) ? total : 0,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
    };
  },

  async remove(bucket, objectPath) {
    await supabaseAdmin().storage.from(bucket).remove([objectPath]);
  },

  async signedUrl(bucket, objectPath, expiresInSeconds) {
    const { data, error } = await supabaseAdmin()
      .storage.from(bucket)
      .createSignedUrl(objectPath, expiresInSeconds);
    if (error) return null;
    return data?.signedUrl ?? null;
  },
};
