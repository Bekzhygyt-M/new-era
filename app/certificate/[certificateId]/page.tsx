import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/config';
import CertificateActions from './CertificateActions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const certificate = await db.getCertificateById(certificateId);

  return {
    title: certificate
      ? `Sertifikat ${certificate.certificate_id} — NEW ERA`
      : 'Sertifikat topilmadi — NEW ERA',
  };
}

/**
 * Certificate page (TZ §23).
 *
 * Publicly readable by design: anyone holding the id can confirm the document,
 * which is the point of verification. Only the four fields printed on the
 * certificate are shown — no email, no progress, no other courses.
 */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const certificate = await db.getCertificateById(certificateId);

  if (!certificate || certificate.revoked) notFound();

  const verifyUrl = `${appConfig.siteUrl}/certificate/verify?id=${encodeURIComponent(
    certificate.certificate_id
  )}`;

  // Rendered to a data URI so the page has no external image request.
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 320,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  const issued = new Date(certificate.issued_at);

  return (
    <div className="min-h-screen bg-[#060606] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link href="/dashboard" className="text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white">
            ← Kabinet
          </Link>
          <CertificateActions verifyUrl={verifyUrl} certificateId={certificate.certificate_id} />
        </div>

        {/* Certificate */}
        <article className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#0d0d0d] to-[#070707] p-8 sm:p-12 print:border-black print:bg-white print:text-black">
          <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/[0.07] print:border-black/20" />

          <div className="relative text-center">
            <p className="mb-1 font-mono text-lg font-black tracking-[0.3em] text-white print:text-black">
              NEW<span className="text-white/40 print:text-black/40">.</span>ERA
            </p>
            <p className="mb-10 text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 print:text-black/50">
              Trading Education Platform
            </p>

            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 print:text-black/50">
              Sertifikat berildi
            </p>

            <h1 className="mb-8 text-3xl font-black tracking-tight text-white sm:text-4xl print:text-black">
              {certificate.full_name}
            </h1>

            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 print:text-black/50">
              Kursni muvaffaqiyatli yakunlagani uchun
            </p>
            <p className="mb-10 text-lg font-bold text-white/90 sm:text-xl print:text-black">
              {certificate.course_title}
            </p>

            <div className="mx-auto mb-8 h-px w-24 bg-white/15 print:bg-black/20" />

            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35 print:text-black/50">
                  Berilgan sana
                </p>
                <p className="font-mono text-sm font-bold text-white print:text-black">
                  {issued.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                <p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-wider text-white/35 print:text-black/50">
                  Certificate ID
                </p>
                <p className="font-mono text-sm font-bold text-white print:text-black">
                  {certificate.certificate_id}
                </p>
              </div>

              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`${certificate.certificate_id} sertifikatini tekshirish uchun QR kod`}
                  width={112}
                  height={112}
                  className="mx-auto rounded-lg bg-white p-1.5"
                />
                <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-white/30 print:text-black/50">
                  Tekshirish uchun skanerlang
                </p>
              </div>
            </div>
          </div>
        </article>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[12px] text-white/35 print:hidden">
          <ShieldCheck size={13} />
          Haqiqiyligini{' '}
          <Link href={`/certificate/verify?id=${certificate.certificate_id}`} className="text-white underline underline-offset-4">
            /certificate/verify
          </Link>{' '}
          sahifasida tekshiring.
        </p>
      </div>
    </div>
  );
}
