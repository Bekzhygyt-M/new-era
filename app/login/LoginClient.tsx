'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { login } from './actions';
import { useI18n } from '@/lib/i18n';

function LoginForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo') || '/dashboard';
  // Only same-site paths — never bounce the user to an external URL.
  const returnTo = rawReturnTo.startsWith('/') ? rawReturnTo : '/dashboard';

  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setIsPending(true);
    try {
      const result = await login(data.email, data.password);

      if ('error' in result) {
        toast.error(result.error);
        setIsPending(false);
        return;
      }

      toast.success('Muvaffaqiyatli kirildi');
      // Full reload so every server component picks up the new session cookie.
      window.location.href = result.isAdmin ? '/admin' : returnTo;
    } catch {
      toast.error('Tarmoq xatosi. Qayta urinib ko‘ring.');
      setIsPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060606] p-4">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 bg-white/[0.03] blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 bg-white/[0.02] blur-[140px]" />

      <div className="relative z-10 w-full max-w-md py-10">
        <header className="mb-8 space-y-3 text-center">
          <Link href="/" className="group inline-block">
            <div className="font-mono text-3xl font-black tracking-widest text-white transition group-hover:text-white/80">
              NEW<span className="text-white/40">.</span>ERA
            </div>
          </Link>

          <div className="flex items-center justify-center gap-1.5 font-mono text-xs text-white/45">
            <Activity size={12} className="text-purple-400" />
            <span>{t('auth.loginBadge')}</span>
          </div>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-3xl border border-white/15 bg-[#0c0c0c] p-6 shadow-2xl sm:p-8"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-white/70"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              placeholder="siz@example.com"
              className={`w-full rounded-xl border bg-[#111] px-4 py-3.5 font-mono text-sm text-white placeholder-white/20 transition-colors focus:border-white focus:outline-none ${
                errors.email ? 'border-red-500' : 'border-white/10'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs font-medium text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-white/70"
            >
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                placeholder="••••••••"
                className={`w-full rounded-xl border bg-[#111] px-4 py-3.5 pr-12 font-mono text-sm text-white placeholder-white/20 transition-colors focus:border-white focus:outline-none ${
                  errors.password ? 'border-red-500' : 'border-white/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs font-medium text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="font-mono text-xs text-white/45 hover:text-white">
              {t('auth.forgotPasswordLink')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-mono text-sm font-black uppercase tracking-wider text-black shadow-xl transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : t('auth.login')}
          </button>

          <div className="border-t border-white/5 pt-4 text-center font-mono text-xs text-white/40">
            {t('auth.dontHaveAccount')}{' '}
            <Link href="/register" className="font-bold text-white hover:underline">
              {t('auth.register')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060606]" />}>
      <LoginForm />
    </Suspense>
  );
}
