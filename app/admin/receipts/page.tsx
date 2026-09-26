import { db } from '@/lib/db';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReceiptsPage() {
  const payments = await db.getPayments();
  const pendingReceipts = payments.filter((p) => p.status === 'receipt_submitted');
  const verifiedReceipts = payments.filter((p) => p.status === 'approved');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">To&apos;lov Kvitansiyalari Galereyasi</h1>
          <p className="text-white/50 text-sm">Foydalanuvchilar tomonidan yuklangan skrinshot va cheklar arxivi.</p>
        </div>
        <Link
          href="/admin/payments"
          className="px-5 py-3 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl flex items-center gap-2"
        >
          <ShieldCheck size={16} /> To&apos;lovlarni tasdiqlash markazi
        </Link>
      </div>

      {/* Pending Queue Highlight */}
      {pendingReceipts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <h2 className="text-lg font-black text-white">Tasdiqlash kutilayotgan kvitansiyalar ({pendingReceipts.length})</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingReceipts.map((p) => (
              <div
                key={p.id}
                className="bg-[#000000] border border-white/20 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center">
                  {p.receipt_url ? (
                    <img
                      src={p.receipt_url}
                      alt="Receipt"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-xs font-mono text-white/40">Kvitansiya fayli yuklanmagan</div>
                  )}
                  <div className="absolute top-2 right-2 bg-white text-black font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Kutilmoqda
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-mono text-white/50 mb-1">
                    <span>{p.order_id || p.id.slice(0, 8)}</span>
                    <span>{p.courses?.title}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {p.first_name || p.profiles?.full_name || 'Noma\'lum'} ({p.phone})
                  </h4>
                  <p className="text-white font-mono font-black text-sm mt-1">
                    {new Intl.NumberFormat('uz-UZ').format(p.amount)} {p.currency}
                  </p>
                </div>

                <Link
                  href="/admin/payments"
                  className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase rounded-xl transition text-center flex items-center justify-center gap-1.5"
                >
                  Ko&apos;rib chiqish & Tasdiqlash <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Verified Archive */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h2 className="text-lg font-black text-white">Tasdiqlangan kvitansiyalar arxivi ({verifiedReceipts.length})</h2>

        {!verifiedReceipts || verifiedReceipts.length === 0 ? (
          <p className="text-xs text-white/40 italic">Hali tasdiqlangan kvitansiyalar yo&apos;q.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {verifiedReceipts.map((p) => (
              <div key={p.id} className="bg-[#000000] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="bg-black/50 border border-white/10 rounded-xl aspect-video overflow-hidden flex items-center justify-center">
                  {p.receipt_url ? (
                    <img src={p.receipt_url} alt="Receipt" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-xs font-mono text-white/30">Chek arxivi</div>
                  )}
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-mono text-[10px] text-white/40 block">{p.order_id}</span>
                  <div className="font-bold text-white truncate">{p.first_name || p.profiles?.full_name}</div>
                  <div className="text-white font-mono font-bold">
                    {new Intl.NumberFormat('uz-UZ').format(p.amount)} {p.currency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
