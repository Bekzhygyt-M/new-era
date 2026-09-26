import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { storeFile, UploadError } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload/video — admin-only lesson video upload (TZ §12, §22.6).
 * Kept as a dedicated path for the existing admin uploader; the generic
 * endpoint is /api/upload/file?kind=video.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminApi();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fayl tanlanmadi' }, { status: 400 });
    }

    const stored = await storeFile(file, 'video');

    return NextResponse.json({
      success: true,
      url: stored.url,
      fileName: stored.fileName,
      size: stored.size,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
}
