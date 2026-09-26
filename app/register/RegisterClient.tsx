'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@/lib/validations';
import { register as registerAction } from '../login/actions';
import { Eye, EyeOff, Loader2, Activity } from 'lucide-react';
import RiskDisclaimerConsent from '@/components/legal/RiskDisclaimerConsent';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  const { t } = useI18n();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);
  const [disclaimerError, setDisclaimerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: '+998 ',
    }
  });

  const onSubmit = async (data: RegisterInput) => {
    // TZ §8.1 — registration is blocked until the disclaimer is accepted.
    if (!acceptDisclaimer) {
      setDisclaimerError('Risk bildirgisini o‘qib, roziligingizni tasdiqlang');
      return;
    }

    setDisclaimerError('');
    setIsPending(true);
    try {
      const result = await registerAction({ ...data, acceptDisclaimer: true });

      if ('error' in result) {
        toast.error(result.error);
        setIsPending(false);
        return;
      }
      
      toast.success('Muvaffaqiyatli ro‘yxatdan o‘tildi!');
      window.location.href = returnTo;
    } catch (error) {
      toast.error('Xatolik yuz berdi. Qayta urinib ko‘ring.');
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/[0.02] blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 py-10">
        <div className="text-center mb-8 space-y-3">
          <Link href="/" className="inline-block group">
            <div className="text-3xl font-black text-white tracking-widest font-mono group-hover:text-neutral-200 transition">
              NEW<span className="text-white/40">.</span>ERA
            </div>
          </Link>

          <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-white/50">
            <Activity size={12} className="text-purple-400" />
            <span>{t('auth.registerBadge')}</span>
          </div>
        </div>


        <form onSubmit={handleSubmit(onSubmit)} className="bg-[#0c0c0c] border border-white/15 p-6 sm:p-8 rounded-3xl space-y-4 shadow-2xl">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-mono">{t('auth.firstName')}</label>
              <input 
                type="text" 
                {...register('firstName')}
                placeholder={t('auth.firstName')}
                className={`w-full bg-[#111111] border ${errors.firstName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-sm font-mono`}
              />
              {errors.firstName && <p className="text-red-400 text-xs mt-1 font-medium">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-mono">{t('auth.lastName')}</label>
              <input 
                type="text" 
                {...register('lastName')}
                placeholder={t('auth.lastName')}
                className={`w-full bg-[#111111] border ${errors.lastName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-sm font-mono`}
              />
              {errors.lastName && <p className="text-red-400 text-xs mt-1 font-medium">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-mono">{t('auth.emailAddress')}</label>
            <input 
              type="email" 
              {...register('email')}
              placeholder="name@example.com"
              className={`w-full bg-[#111111] border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-sm font-mono`}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1 font-medium">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-mono">{t('auth.phone')}</label>
            <input 
              type="tel" 
              {...register('phone')}
              placeholder="+998 90 123 45 67"
              className={`w-full bg-[#111111] border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-sm font-mono`}
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1 font-medium">{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-mono">{t('auth.securePassword')}</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                {...register('password')}
                placeholder="••••••••"
                className={`w-full bg-[#111111] border ${errors.password ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-sm font-mono`}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1 font-medium">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-mono">{t('auth.confirmPasswordLabel')}</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`w-full bg-[#111111] border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-sm font-mono`}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>}
          </div>

          <RiskDisclaimerConsent
            accepted={acceptDisclaimer}
            onChange={(value) => {
              setAcceptDisclaimer(value);
              if (value) setDisclaimerError('');
            }}
            error={disclaimerError}
          />

          <button
            type="submit"
            disabled={isPending || !acceptDisclaimer}
            className="w-full bg-white hover:bg-neutral-200 disabled:bg-white/25 disabled:text-black/40 disabled:cursor-not-allowed text-black font-black uppercase tracking-wider py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xl mt-4 text-sm font-mono"
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : t('auth.createAccount')}
          </button>

          <div className="text-center pt-4 border-t border-white/5 text-xs text-white/40 font-mono">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-white hover:underline font-bold">
              {t('auth.login')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060606]" />}>
      <RegisterForm />
    </Suspense>
  );
}
