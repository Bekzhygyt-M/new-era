'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Parol kamida 8 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Parollar bir-biriga mos kelmadi');
      return;
    }
    if (!token) {
      toast.error('Havola yaroqsiz. Parolni tiklash so‘rovini qaytadan yuboring.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parolni yangilashda xatolik');

      toast.success('Parol muvaffaqiyatli o\'zgartirildi! Endi kirishingiz mumkin.');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Parolni yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="mb-8">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">Xavfsizlik</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Yangi parol o&apos;rnating</h1>
            <p className="text-white/50 text-xs mt-2">
              Akkauntingiz uchun yangi xavfsiz parol kiriting.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Yangi parol *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Parolni tasdiqlang *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Saqlanmoqda...
                </>
              ) : (
                <>
                  Parolni saqlash <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
