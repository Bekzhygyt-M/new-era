import path from 'path';
import os from 'os';
import fs from 'fs';

function resolveDataRoot(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;

  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.VERCEL
  );

  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'newera_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {
      // ignore
    }
    return tmpDir;
  }

  // Check if cwd is writable, otherwise fallback to tmp
  try {
    const testDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = path.join(testDir, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return process.cwd();
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'newera_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {
      // ignore
    }
    return tmpDir;
  }
}

/**
 * Where the app is allowed to write.
 *
 * In serverless environments (Netlify, Vercel, AWS Lambda) process.cwd() is read-only,
 * so we resolve to a writable directory (/tmp/newera_data) when DATA_DIR is not set.
 */
export const DATA_ROOT = resolveDataRoot();

/** JSON store and the development session secret. */
export const DB_DIR = path.join(DATA_ROOT, 'data');

/** Uploads that must never be served straight from the web root. */
export const PRIVATE_UPLOADS_DIR = path.join(DATA_ROOT, 'private', 'uploads');
