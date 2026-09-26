import { NextResponse } from 'next/server';
import { DATA_ROOT } from '@/lib/paths';
import { databaseDriver } from '@/lib/db';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — liveness probe for the host (Railway, Docker, uptime checks).
 *
 * Deliberately reveals nothing sensitive: which backends are active and whether
 * the writable root is configured, never a key, a path secret or a row count.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    database: databaseDriver,
    storage: storage.name,
    // Warns loudly when a container is writing to a directory a redeploy wipes.
    persistentDataDir: Boolean(process.env.DATA_DIR),
    dataRootConfigured: DATA_ROOT !== process.cwd(),
    time: new Date().toISOString(),
  });
}
