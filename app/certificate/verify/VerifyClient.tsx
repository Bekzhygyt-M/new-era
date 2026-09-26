'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldX, Search } from 'lucide-react';

interface VerifyResult {
  valid: boolean;
  certificateId: string;
  fullName?: string;
  courseTitle?: string;
  issuedAt?: string;
}

export default function VerifyClient({ initialId }: { initialId: string }) {
  const [value, setValue] = useState(initialId);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verify = useCallback(async (certificateId: string) => {
    const id = certificateId.trim();
    if (!id) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/certificate/verify?id=${encodeURIComponent(id)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Tekshirib bo‘lmadi');
        return;
      }

      setResult(data);
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setLoading(false);
    }
  }, []);

  // A QR code links straight here with ?id=..., so verify on arrival.
  useEffect(() => {
    if (initialId) void verify(initialId);
  }, [initialId, verify]);

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify(value);
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor="certificate-id">
          Certificate ID
        </label>
        <input
          id="certificate-id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="NE-STD-2026-000124"
          className="flex-1 rounded-xl border border-white/12 bg-[#111] px-4 py-3.5 font-mono text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Tekshirish
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div
          className={`rounded-2xl border p-6 text-center ${
            result.valid
              ? 'border-emerald-400/30 bg-emerald-400/[0.06]'
              : 'border-red-500/30 bg-red-500/[0.06]'
          }`}
        >
          {result.valid ? (
            <>
              <ShieldCheck size={38} className="mx-auto mb-3 text-emerald-400" />
              <p className="mb-5 text-sm font-black uppercase tracking-wider text-emerald-300">
                Sertifikat haqiqiy
              </p>

              <dl className="space-y-3 text-left text-[13px]">
                <div className="flex justify-between gap-4 border-b border-white/[0.07] pb-3">
                  <dt className="text-white/40">Ism, familiya</dt>
                  <dd className="text-right font-bold text-white">{result.fullName}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/[0.07] pb-3">
                  <dt className="text-white/40">Kurs</dt>
                  <dd className="text-right font-bold text-white">{result.courseTitle}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/[0.07] pb-3">
                  <dt className="text-white/40">Berilgan sana</dt>
                  <dd className="text-white/80">
                    {result.issuedAt ? new Date(result.issuedAt).toLocaleDateString('uz-UZ') : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Certificate ID</dt>
                  <dd className="font-mono text-white/80">{result.certificateId}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <ShieldX size={38} className="mx-auto mb-3 text-red-400" />
              <p className="mb-2 text-sm font-black uppercase tracking-wider text-red-300">
                Invalid Certificate
              </p>
              <p className="text-[13px] text-white/50">
                <span className="font-mono">{result.certificateId}</span> — bunday sertifikat topilmadi
                yoki u bekor qilingan.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
