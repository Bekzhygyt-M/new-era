import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificate/verify?id=NE-STD-2026-000124
 *
 * Public verification (TZ §23). Returns only what a certificate shows on its
 * face — name, course, date, id, validity — and nothing else about the holder.
 */
export async function GET(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`cert:${ip}`, 60, 10 * 60 * 1000);

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Juda ko‘p so‘rov' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ valid: false, error: 'Sertifikat ID kiritilmagan' }, { status: 400 });
  }

  const certificate = await db.getCertificateById(id);

  if (!certificate || certificate.revoked) {
    return NextResponse.json({ valid: false, certificateId: id });
  }

  return NextResponse.json({
    valid: true,
    certificateId: certificate.certificate_id,
    fullName: certificate.full_name,
    courseTitle: certificate.course_title,
    issuedAt: certificate.issued_at,
  });
}
