import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/disclaimer — the currently active risk disclaimer (TZ §8.1). */
export async function GET() {
  const disclaimer = await db.getActiveDisclaimer();
  return NextResponse.json({
    version: disclaimer.version,
    summary_points: disclaimer.summary_points,
    content: disclaimer.content,
  });
}
