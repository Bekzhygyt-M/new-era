'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Root error boundary.
 *
 * Without this, an unhandled throw in any server component renders Next's
 * bare development overlay — which leaks internals in production and offers the
 * visitor no way back. This keeps the failure on-brand and recoverable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side detail stays server-side; only the digest is client-visible.
    console.error('[app] render error:', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="font-mono text-7xl font-black text-white/20 mb-4">500</div>
      <h1 className="text-2xl font-black text-white mb-2">Xatolik yuz berdi</h1>
      <p className="text-sm text-white/50 mb-6 max-w-sm">
        Sahifani yuklashda muammo bo‘ldi. Iltimos, qayta urinib ko‘ring.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:bg-neutral-200"
        >
          Qayta urinish
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-white/20 text-white font-black text-xs uppercase tracking-wider rounded-xl transition hover:bg-white/10"
        >
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  );
}