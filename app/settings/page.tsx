'use client';

import { useState, useEffect } from 'react';
import UserSidebar from '@/components/dashboard/UserSidebar';
import UserHeader from '@/components/dashboard/UserHeader';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import { User, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function SettingsPage() {
  const { t } = useI18n();
  // Empty until the real profile arrives — a stand-in name and phone number
  // shown to every visitor is worse than a blank field.
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data?.profile) {
          if (data.profile.full_name) setFullName(data.profile.full_name);
          if (data.profile.email) setEmail(data.profile.email);
          if (data.profile.phone) setPhone(data.profile.phone);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
        }),
      });
      // A failed save used to report success, so the change looked applied
      // when it had not been.
      if (!res.ok) throw new Error('save failed');
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-white selection:bg-white selection:text-black">
      <UserSidebar activeTab="settings" />

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#050505]">
        <UserHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1000px] w-full mx-auto">
          {/* Header */}
          <div className="pb-4 border-b border-white/10">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">{t('settings.pageTitle')}</h1>
            <p className="text-xs sm:text-sm text-white/50">{t('settings.pageSubtitle')}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono uppercase">
                <User size={18} className="text-white" />
                {t('settings.personalInfo')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-white/50 mb-1.5">{t('settings.fullNameLabel')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#080808] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                <div>
                  <label className="block text-white/50 mb-1.5">{t('auth.emailAddress')}</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-white/40 cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-white/50 mb-1.5">{t('auth.phone')}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#080808] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition font-mono"
                  />
                </div>

              </div>
            </div>

            <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono uppercase">
                <Lock size={18} className="text-white" />
                {t('settings.securityPassword')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-white/50 mb-1.5">{t('settings.newPasswordLabel')}</label>
                  <input
                    type="password"
                    placeholder="Kamida 6 ta belgi"
                    className="w-full bg-[#080808] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                <div>
                  <label className="block text-white/50 mb-1.5">{t('auth.confirmPasswordLabel')}</label>
                  <input
                    type="password"
                    placeholder="Parolni qaytadan kiriting"
                    className="w-full bg-[#080808] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl flex items-center gap-2 font-mono"
              >
                <Save size={15} />
                <span>{saving ? t('settings.saving') : t('settings.saveChanges')}</span>
              </button>
            </div>
          </form>

          <DashboardFooter />
        </div>
      </main>
    </div>
  );
}
