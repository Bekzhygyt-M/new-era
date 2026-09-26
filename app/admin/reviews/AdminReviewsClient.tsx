'use client';

import { useState } from 'react';
import type { ReviewWithAuthor } from '@/types/admin';
import { Star, Check, Trash2, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface AdminReviewsClientProps {
  initialReviews: ReviewWithAuthor[];
}

export default function AdminReviewsClient({ initialReviews }: AdminReviewsClientProps) {
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>(initialReviews);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApproveReview = async (reviewId: string) => {
    setLoadingId(reviewId);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, approved: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      toast.success('Sharh tasdiqlandi va saytda ko\'rinadi!');
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, approved: true } : r))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Ushbu sharhni o\'chirib tashlamoqchimisiz?')) return;

    setLoadingId(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O\'chirishda xatolik');

      toast.success('Sharh o\'chirildi');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'O\'chirishda xatolik');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-white/5">
        <h1 className="text-3xl font-black text-white">Sharhlar Moderatsiyasi</h1>
        <p className="text-white/50 text-sm">Talabalar tomonidan qoldirilgan fikrlar va ularni saytda chiqarishni tasdiqlash.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!reviews || reviews.length === 0 ? (
          <div className="col-span-full py-16 text-center text-white/40">
            Hozircha moderatsiya uchun sharhlar mavjud emas.
          </div>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className={`bg-[#111] border rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl ${
                r.approved ? 'border-white/5' : 'border-amber-500/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400" />
                    ))}
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    r.approved
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                  }`}>
                    {r.approved ? 'Tasdiqlangan' : 'Kutilmoqda'}
                  </span>
                </div>

                <p className="text-white/80 text-xs italic leading-relaxed mb-4">
                  &ldquo;{r.content}&rdquo;
                </p>

                <div className="text-xs font-mono text-white/40 space-y-0.5">
                  <span className="text-white font-bold block">{r.profiles?.full_name || 'Ismsiz'}</span>
                  <span>{r.courses?.title} • {new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-2">
                {!r.approved && (
                  <button
                    onClick={() => handleApproveReview(r.id)}
                    disabled={loadingId === r.id}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <Check size={14} /> Tasdiqlash
                  </button>
                )}
                <button
                  onClick={() => handleDeleteReview(r.id)}
                  disabled={loadingId === r.id}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs rounded-xl border border-rose-500/20 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
