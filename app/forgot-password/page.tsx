'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, CheckCircle2, ChevronLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t('forgotPassword.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('forgotPassword.genericError'));

      setSubmitted(true);
      toast.success(t('forgotPassword.requestSent'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('forgotPassword.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs font-bold mb-6 transition">
          <ChevronLeft size={16} /> {t('forgotPassword.backToLogin')}
        </Link>

        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-white">{t('forgotPassword.sentTitle')}</h2>
              <p className="text-white/60 text-xs leading-relaxed">
                <span className="text-white font-bold">{email}</span> {t('forgotPassword.sentBody')}
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition"
              >
                {t('forgotPassword.goToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">
                  {t('forgotPassword.securityBadge')}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{t('forgotPassword.resetPasswordTitle')}</h1>
                <p className="text-white/50 text-xs mt-2">{t('forgotPassword.resetPasswordSubtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">{t('forgotPassword.emailLabel')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="treyder@gmail.com"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> {t('forgotPassword.sending')}
                    </>
                  ) : (
                    <>
                      {t('forgotPassword.sendResetLink')} <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
