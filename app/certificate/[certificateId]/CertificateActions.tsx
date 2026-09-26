'use client';

import { useState } from 'react';
import { Printer, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

/** Print and copy-link controls for a certificate (client-only side effects). */
export default function CertificateActions({
  verifyUrl,
  certificateId,
}: {
  verifyUrl: string;
  certificateId: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Nusxalab bo‘lmadi. ID: ${certificateId}`);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white/60 transition hover:border-white/30 hover:text-white"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        Havola
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white/60 transition hover:border-white/30 hover:text-white"
      >
        <Printer size={12} />
        Chop etish
      </button>
    </div>
  );
}
