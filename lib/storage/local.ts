import fs from 'fs';
import { PRIVATE_UPLOADS_DIR } from '@/lib/paths';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import type { ReadableObject, StorageDriver } from '@/lib/storage/types';

/**
 * Local disk backend.
 *
 * Everything lives under `private/` — outside the web root — so a file is
 * reachable only through an authorized route handler.
 */
const ROOT = PRIVATE_UPLOADS_DIR;

/** Resolves inside the root, refusing traversal via `..`. */
function resolve(bucket: string, objectPath: string): string | null {
  const full = path.resolve(ROOT, bucket, objectPath);
  const base = path.resolve(ROOT, bucket);
  return full === base || full.startsWith(base + path.sep) ? full : null;
}

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export const localStorage: StorageDriver = {
  name: 'local',

  async put(bucket, objectPath, bytes) {
    const full = resolve(bucket, objectPath);
    if (!full) throw new Error('Noto‘g‘ri yo‘l');
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, bytes, { mode: 0o600 });
  },

  async size(bucket, objectPath) {
    const full = resolve(bucket, objectPath);
    if (!full || !fs.existsSync(full)) return null;
    return fs.statSync(full).size;
  },

  async read(bucket, objectPath, start, end): Promise<ReadableObject | null> {
    const full = resolve(bucket, objectPath);
    if (!full || !fs.existsSync(full)) return null;

    const { size } = fs.statSync(full);
    const options = start === undefined ? undefined : { start, end };
    const stream = Readable.toWeb(fs.createReadStream(full, options)) as ReadableStream;

    return {
      stream,
      size,
      contentType: CONTENT_TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream',
    };
  },

  async remove(bucket, objectPath) {
    const full = resolve(bucket, objectPath);
    if (!full) return;
    await fsp.unlink(full).catch(() => undefined);
  },

  /** Local files are always streamed through the app, never linked directly. */
  async signedUrl() {
    return null;
  },
};
