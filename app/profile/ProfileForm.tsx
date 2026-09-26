'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { changePassword } from '@/app/login/actions';

/** Profile editing + password change (TZ §24). */
export default function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('profile.saveFailed'));
        return;
      }

      toast.success(t('profile.profileUpdated'));
      router.refresh();
    } catch {
      toast.error(t('profile.networkError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwords.next !== passwords.confirm) {
      toast.error(t('profile.passwordsMismatch'));
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changePassword(passwords.current, passwords.next);

      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t('profile.passwordUpdated'));
      setPasswords({ current: '', next: '', confirm: '' });
    } catch {
      toast.error(t('profile.passwordChangeFailed'));
    } finally {
      setSavingPassword(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none';

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">
            {t('profile.nameLabel')}
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required minLength={2} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">
            {t('profile.phone')}
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+998 90 123 45 67"
          />
        </label>

        <button
          type="submit"
          disabled={savingProfile}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90 disabled:opacity-50"
        >
          {savingProfile && <Loader2 size={14} className="animate-spin" />}
          {t('profile.saveProfile')}
        </button>
      </form>

      <form onSubmit={savePassword} className="space-y-3 border-t border-white/[0.07] pt-6">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50">
          {t('profile.changePassword')}
        </h3>

        <input
          type="password"
          autoComplete="current-password"
          value={passwords.current}
          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
          className={inputClass}
          placeholder="Joriy parol"
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          value={passwords.next}
          onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
          className={inputClass}
          placeholder="Yangi parol (kamida 8 ta belgi)"
          minLength={8}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          value={passwords.confirm}
          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          className={inputClass}
          placeholder="Yangi parolni tasdiqlang"
          minLength={8}
          required
        />

        <button
          type="submit"
          disabled={savingPassword}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:border-white/35 disabled:opacity-50"
        >
          {savingPassword && <Loader2 size={14} className="animate-spin" />}
          {t('profile.updatePassword')}
        </button>
      </form>
    </div>
  );
}
