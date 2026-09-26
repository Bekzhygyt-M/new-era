'use client';

import { useState } from 'react';
import { KeyRound, Check, X, Copy, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ResetRequest {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  created_at: string;
  approved_at?: string | null;
  expires_at?: string | null;
  used_at?: string | null;
  expired?: boolean;
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: 'Kutilmoqda', className: 'bg-white/10 text-white border-white/20' },
  approved: { text: 'Tasdiqlangan', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  rejected: { text: 'Rad etilgan', className: 'bg-red-500/10 text-red-300 border-red-500/30' },
  used: { text: 'Ishlatilgan', className: 'bg-white/5 text-white/40 border-white/10' },
};

export default function AdminPasswordResetsClient({
  initialRequests,
  ttlMinutes,
}: {
  initialRequests: ResetRequest[];
  ttlMinutes: number;
}) {
  const [requests, setRequests] = useState<ResetRequest[]>(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Links are returned once and never stored in readable form. */
  const [links, setLinks] = useState<Record<string, string>>({});

  const refresh = async () => {
    const res = await fetch('/api/admin/password-resets', { cache: 'no-store' });
    if (res.ok) setRequests((await res.json()).requests || []);
  };

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/password-resets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      if (action === 'approve') {
        setLinks((prev) => ({ ...prev, [id]: data.link }));
        toast.success(`Havola yaratildi — ${ttlMinutes} daqiqa amal qiladi`);
      } else {
        toast.success('So‘rov rad etildi');
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Havola nusxalandi');
    } catch {
      toast.error('Nusxalab bo‘lmadi — havolani qo‘lda belgilang');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Parolni tiklash so‘rovlari</h1>
          <p className="text-white/50 text-sm mt-1">
            Foydalanuvchi shaxsini tasdiqlagach, bir martalik havola yarating va unga yuboring.
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw size={14} /> Yangilash
        </button>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
        <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-white/60 leading-relaxed">
          Havola faqat bir marta ishlaydi va {ttlMinutes} daqiqadan so‘ng kuchini yo‘qotadi. U shu yerda
          bir marta ko‘rsatiladi — bazada faqat uning xeshi saqlanadi, shuning uchun keyin tiklab bo‘lmaydi.
          Havolani faqat shaxsini tekshirgan foydalanuvchiga bering.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-12 text-center text-white/50">
          <KeyRound size={28} className="mx-auto mb-3 text-white/25" />
          Hozircha so‘rovlar yo‘q.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const badge = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
            const link = links[r.id];

            return (
              <div key={r.id} className="bg-[#000000] border border-white/15 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-sm font-bold text-white">{r.email}</span>
                    <span className="block text-[11px] text-white/40 font-mono mt-0.5">
                      {new Date(r.created_at).toLocaleString('uz-UZ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${badge.className}`}>
                      {r.expired && r.status === 'approved' ? 'Muddati tugagan' : badge.text}
                    </span>

                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => act(r.id, 'approve')}
                          disabled={busyId === r.id}
                          className="px-4 py-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5"
                        >
                          <Check size={14} /> Tasdiqlash
                        </button>
                        <button
                          onClick={() => act(r.id, 'reject')}
                          disabled={busyId === r.id}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                          <X size={14} /> Rad etish
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {link && (
                  <div className="bg-white/[0.03] border border-emerald-500/25 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold">
                      Bir martalik havola — faqat hozir ko‘rsatiladi
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] text-white/80 break-all font-mono">{link}</code>
                      <button
                        onClick={() => copy(link)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition shrink-0"
                        aria-label="Havoladan nusxa olish"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
