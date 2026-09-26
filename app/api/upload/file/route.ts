import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, requireAdminApi, apiError } from '@/lib/permissions';
import { storeFile, UploadError, type UploadKind } from '@/lib/uploads';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload/file?kind=video|receipt|image
 *
 * Videos are admin-only. Receipts and avatars require a signed-in user.
 * Type and size are validated server-side (TZ §29).
 */
export async function POST(request: NextRequest) {
  try {
    const kind = (new URL(request.url).searchParams.get('kind') || 'image') as UploadKind;

    if (!['video', 'receipt', 'image'].includes(kind)) {
      return NextResponse.json({ error: 'Noto‘g‘ri yuklash turi' }, { status: 400 });
    }

    const auth = kind === 'video' ? await requireAdminApi() : await requireUserApi();

    const limit = rateLimit(`upload:${auth.profile.id}:${kind}`, kind === 'video' ? 30 : 15, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Juda ko‘p fayl yuklandi. Biroz kutib turing.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fayl tanlanmadi' }, { status: 400 });
    }

    const stored = await storeFile(file, kind, kind === 'receipt' ? auth.profile.id : '');

    return NextResponse.json({
      success: true,
      url: stored.url,
      fileName: stored.fileName,
      size: stored.size,
      contentType: stored.contentType,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
}
