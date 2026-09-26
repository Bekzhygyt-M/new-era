import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { storage, BUCKETS } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/receipt/<stored-path>
 *
 * Serves a payment receipt from private storage. Only the payer and admins may
 * read it — receipts are never exposed under /public (TZ §29).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const auth = await requireUserApi();
    const { path: segments } = await context.params;
    const objectPath = segments.join('/');

    if (objectPath.includes('..')) throw new ApiError('Noto‘g‘ri yo‘l', 400);

    const isOwner = objectPath.startsWith(auth.profile.id + '/') || objectPath.startsWith(auth.profile.id);
    const url = `/api/receipt/${objectPath}`;
    const payment = (await db.getPayments()).find((p) => p.receipt_url === url);

    if (!auth.isAdmin && !isOwner && (!payment || payment.user_id !== auth.profile.id)) {
      throw new ApiError('Ruxsat berilmagan', 403);
    }

    const object = await storage.read(BUCKETS.receipt, objectPath);
    if (!object) throw new ApiError('Chek fayli topilmadi', 404);

    return new NextResponse(object.stream, {
      headers: {
        'Content-Type': object.contentType,
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
