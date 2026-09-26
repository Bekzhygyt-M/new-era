import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, ApiError, canAccessCourse, courseIdForLesson } from '@/lib/permissions';
import { db } from '@/lib/db';
import { storage, BUCKETS } from '@/lib/storage';
import { isLessonUnlocked } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/** How long a direct video link stays usable once access has been checked. */
const SIGNED_URL_TTL_SECONDS = 60;

/** Parses `Range: bytes=start-end`. Returns null when absent or unsatisfiable. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, startRaw, endRaw] = match;

  // Suffix form: `bytes=-500` means the last 500 bytes.
  if (startRaw === '') {
    const length = Number(endRaw);
    if (!length) return null;
    return { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(startRaw);
  const end = endRaw === '' ? size - 1 : Math.min(Number(endRaw), size - 1);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;

  return { start, end };
}

/**
 * GET /api/video/<stored-path>
 *
 * Serves a lesson video from private storage (TZ §12).
 *
 * The lesson page already gates access, but the object itself must be protected
 * too — otherwise the URL alone would hand a paid lesson to anyone. Access
 * requires an active enrollment *and* the lesson to be unlocked in sequence;
 * admins and preview-enabled lessons bypass those checks.
 *
 * Once access is granted, a backend that can mint a short-lived signed URL gets
 * to serve the bytes directly; otherwise the file is streamed here with Range
 * support so the player can seek.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const auth = await requireUserApi();
    const { path: segments } = await context.params;
    const objectPath = segments.join('/');

    if (objectPath.includes('..')) throw new ApiError('Noto‘g‘ri yo‘l', 400);

    const lesson = (await db.getLessons()).find((l) => l.video_url === `/api/video/${objectPath}`);
    if (!lesson) throw new ApiError('Video topilmadi', 404);

    if (!auth.isAdmin && !lesson.preview_enabled) {
      if (!(await canAccessCourse(auth.profile, await courseIdForLesson(lesson.id)))) {
        throw new ApiError('Bu kursga kirish huquqingiz yo‘q', 403);
      }
      if (!(await isLessonUnlocked(auth.profile.id, lesson.id)).unlocked) {
        throw new ApiError('Dars hali ochilmagan', 403);
      }
    }

    // Access is settled — hand off to a signed URL when the backend offers one.
    const signed = await storage.signedUrl(BUCKETS.video, objectPath, SIGNED_URL_TTL_SECONDS);
    if (signed) {
      return NextResponse.redirect(signed, {
        status: 307,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    const size = await storage.size(BUCKETS.video, objectPath);
    if (size === null) throw new ApiError('Video fayli topilmadi', 404);

    const baseHeaders = {
      'Accept-Ranges': 'bytes',
      // Private: never cached by a shared proxy, never handed to another viewer.
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline',
    };

    const range = parseRange(request.headers.get('range'), size);

    if (!range) {
      // An unsatisfiable Range must be refused rather than silently ignored.
      if (request.headers.get('range')) {
        return new NextResponse(null, {
          status: 416,
          headers: { ...baseHeaders, 'Content-Range': `bytes */${size}` },
        });
      }

      const whole = await storage.read(BUCKETS.video, objectPath);
      if (!whole) throw new ApiError('Video fayli topilmadi', 404);

      return new NextResponse(whole.stream, {
        status: 200,
        headers: { ...baseHeaders, 'Content-Type': whole.contentType, 'Content-Length': String(size) },
      });
    }

    const { start, end } = range;
    const part = await storage.read(BUCKETS.video, objectPath, start, end);
    if (!part) throw new ApiError('Video fayli topilmadi', 404);

    return new NextResponse(part.stream, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Type': part.contentType,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
