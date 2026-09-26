import path from 'path';
import crypto from 'crypto';
import { uploadLimits } from '@/lib/config';
import { storage, BUCKETS } from '@/lib/storage';

/**
 * Upload handling (TZ §12, §19, §29).
 *
 * Files never land in the web root. Both lesson videos and payment receipts go
 * to private storage and are served only through an authorized route handler,
 * so possessing a URL is not enough to read a paid lesson or someone's receipt.
 *
 * The concrete backend (local disk or Supabase Storage) lives in lib/storage.
 */

export type UploadKind = keyof typeof uploadLimits;


const PRIVATE_KINDS: UploadKind[] = ['receipt', 'video'];

export interface StoredFile {
  /** Path to reference from the app: a /uploads/... or authorized-route URL. */
  url: string;
  fileName: string;
  size: number;
  contentType: string;
  storagePath: string;
}

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function sanitizeExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

/**
 * Validates the declared MIME type *and* the extension. A file that passes
 * one but not the other is rejected — a .mp4 labelled image/png is not a video.
 */
export function validateFile(file: File, kind: UploadKind) {
  const limits = uploadLimits[kind];
  const ext = sanitizeExtension(file.name);

  if (!file.size) throw new UploadError('Fayl bo‘sh');

  if (file.size > limits.maxBytes) {
    const mb = Math.round(limits.maxBytes / (1024 * 1024));
    throw new UploadError(`Fayl hajmi ${mb} MB dan oshmasligi kerak`, 413);
  }

  if (!limits.mimeTypes.includes(file.type)) {
    throw new UploadError(`Ruxsat etilmagan fayl turi: ${file.type || 'noma’lum'}`);
  }

  if (!ext || !limits.extensions.includes(ext)) {
    throw new UploadError(`Ruxsat etilmagan fayl kengaytmasi: ${ext || 'yo‘q'}`);
  }

  return ext;
}

export async function storeFile(file: File, kind: UploadKind, subdir = ''): Promise<StoredFile> {
  const ext = validateFile(file, kind);
  const bucket = BUCKETS[kind];

  // Unpredictable name: a receipt path must not be guessable from an order id.
  const safeName = `${Date.now().toString(36)}-${crypto.randomBytes(12).toString('hex')}${ext}`;
  const cleanSubdir = subdir.replace(/[^a-zA-Z0-9/_-]/g, '');
  if (cleanSubdir.includes('..')) throw new UploadError('Noto‘g‘ri yo‘l', 400);

  const objectPath = [cleanSubdir, safeName].filter(Boolean).join('/');
  const bytes = Buffer.from(await file.arrayBuffer());

  await storage.put(bucket, objectPath, bytes, file.type || 'application/octet-stream');

  return {
    url: `/api/${kind}/${objectPath}`,
    fileName: file.name,
    size: file.size,
    contentType: file.type,
    storagePath: objectPath,
  };
}

/** Bucket + object path behind one of the app's storage URLs. */
export function parseStorageUrl(url: string): { bucket: string; objectPath: string } | null {
  for (const [kind, bucket] of Object.entries(BUCKETS)) {
    const prefix = `/api/${kind}/`;
    if (url.startsWith(prefix)) {
      const objectPath = url.slice(prefix.length);
      if (!objectPath || objectPath.includes('..')) return null;
      return { bucket, objectPath };
    }
  }
  return null;
}

export async function deleteStoredFile(url: string): Promise<void> {
  const target = parseStorageUrl(url);
  if (!target) return;
  await storage.remove(target.bucket, target.objectPath);
}
