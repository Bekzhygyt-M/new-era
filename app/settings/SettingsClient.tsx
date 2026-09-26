'use client';

import { useState } from 'react';
import type { LocalProfile } from '@/types/admin';
import Link from 'next/link';
import { useI18n, type Locale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { changePassword } from '@/app/login/actions';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Moon, 
  Sun, 
  Lock, 
  User, 
  ShieldCheck, 
  Check, 
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsClientProps {
  profile: LocalProfile;
  userEmail: string;
}

export default function SettingsClient({ profile, userEmail }: SettingsClientProps) {
  const { locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Parol kamida 8 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Parollar bir-biriga mos kelmadi');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Re-authenticate with the current password before rotating it (TZ §29).
      const result = await changePassword(currentPassword, password);
      if ('error' in result) throw new Error(result.error);

      toast.success('Parolingiz muvaffaqiyatli yangilandi!');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Parolni o\'zgartirishda xatolik');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <SettingsIcon size={14} /> Shaxsiy sozlamalar
          </div>
          <h1 className="text-3xl font-black text-white">Sozlamalar</h1>
        </div>

        <Link
          href="/dashboard"
          className="text-white/50 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ChevronLeft size={16} /> Kabinetga qaytish
        </Link>
      </div>

      {/* Language & Theme Section */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Globe size={18} className="text-emerald-400" />
          Til va ko&apos;rinish sozlamalari
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Language Selector */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-mono uppercase text-white/50 block">Interfeys tili</span>
            <div className="flex gap-2">
              {([
                { code: 'uz', label: 'O\'zbek' },
                { code: 'ru', label: 'Русский' },
                { code: 'en', label: 'English' },
              ] as { code: Locale; label: string }[]).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLocale(lang.code);
                    toast.success(`Til ${lang.label}ga o'zgartirildi`);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition border ${
                    locale === lang.code
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-white/5 text-white/70 border-white/5 hover:border-white/20'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selector */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-mono uppercase text-white/50 block">Mavzu (Theme)</span>
            <button
              onClick={() => {
                toggleTheme();
                toast.success('Mavzu o\'zgartirildi');
              }}
              className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/5 flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon size={16} className="text-emerald-400" /> : <Sun size={16} className="text-amber-400" />}
                <span className="capitalize">{theme} Mode</span>
              </div>
              <span className="text-white/40 text-[10px] uppercase font-mono">O&apos;zgartirish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <User size={18} className="text-emerald-400" />
          Akkaunt ma&apos;lumotlari
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
            <span className="text-[11px] text-white/40 block mb-1 uppercase">Email manzil:</span>
            <span className="text-white font-bold">{userEmail}</span>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
            <span className="text-[11px] text-white/40 block mb-1 uppercase">Daraja & XP:</span>
            <span className="text-emerald-400 font-bold">{profile?.level || 'Beginner'} ({profile?.xp || 0} XP)</span>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Lock size={18} className="text-emerald-400" />
          Parolni o&apos;zgartirish
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Joriy parol *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Yangi parol *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Yangi parolni tasdiqlang *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            {isChangingPassword ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saqlanmoqda...
              </>
            ) : (
              'Parolni yangilash'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
