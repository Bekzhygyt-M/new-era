/**
 * File storage contract (TZ §12, §19, §29).
 *
 * Two backends behind one interface, mirroring the data layer: the local disk
 * for development, Supabase Storage for production — Vercel's filesystem is
 * per-instance and wiped on redeploy, so uploads cannot live there.
 *
 * Public URLs are identical for both backends (`/api/video/…`, `/api/receipt/…`),
 * so a stored lesson or receipt keeps working if the backend changes.
 */

export interface StoredObject {
  /** Path the application stores and serves through its authorized routes. */
  url: string;
  /** Backend-relative path, e.g. `videos/abc.mp4`. */
  storagePath: string;
  fileName: string;
  size: number;
  contentType: string;
}

export interface ReadableObject {
  /** Byte stream for the requested range (or the whole object). */
  stream: ReadableStream;
  /** Total object size, needed for Content-Range. */
  size: number;
  contentType: string;
}

export interface StorageDriver {
  readonly name: 'local' | 'supabase';

  put(bucket: string, path: string, bytes: Buffer, contentType: string): Promise<void>;

  /** Object size, or null when it does not exist. */
  size(bucket: string, path: string): Promise<number | null>;

  /** Reads a byte range; `end` is inclusive. Omit both for the whole object. */
  read(bucket: string, path: string, start?: number, end?: number): Promise<ReadableObject | null>;

  remove(bucket: string, path: string): Promise<void>;

  /**
   * A time-limited direct URL, when the backend can issue one.
   * Returns null for backends that must stream through the app.
   */
  signedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string | null>;
}
