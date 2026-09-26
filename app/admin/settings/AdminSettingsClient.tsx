'use client';

import { useState } from 'react';
import { Save, AlertCircle, CreditCard, Sparkles, Award, Headphones, ShieldCheck, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminSettings } from '@/lib/local-db';

interface AdminSettingsClientProps {
  initialSettings?: AdminSettings;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  // Extract initial card values
  const defaultHumo = initialSettings?.cards?.find((c) => c.type.toLowerCase().includes('humo'))?.number || '9860 1701 1477 2172';
  const defaultUzkart = initialSettings?.cards?.find((c) => c.type.toLowerCase().includes('uzkart') || c.type.toLowerCase().includes('uzcard'))?.number || '5614 6821 1727 0571';
  const defaultVisa = initialSettings?.cards?.find((c) => c.type.toLowerCase().includes('visa'))?.number || '4023 0602 4867 3021';
  const defaultHolder = initialSettings?.card_holder || 'Abbos Erkinov';

  // Cards State
  const [humoNumber, setHumoNumber] = useState(defaultHumo);
  const [uzkartNumber, setUzkartNumber] = useState(defaultUzkart);
  const [visaNumber, setVisaNumber] = useState(defaultVisa);
  const [cardHolder, setCardHolder] = useState(defaultHolder);

  // Platform & Education Settings State
  const [passingScore, setPassingScore] = useState(String(initialSettings?.passing_score ?? 90));
  const [watchRequirement, setWatchRequirement] = useState(String(initialSettings?.watch_requirement ?? 90));
  const [supportEmail, setSupportEmail] = useState(initialSettings?.support_email || 'support@newera.uz');
  const [supportTelegram, setSupportTelegram] = useState(initialSettings?.support_telegram || 'https://t.me/newerasupport_bot');
  const [telegramChannel, setTelegramChannel] = useState(initialSettings?.telegram_channel_url || 'https://t.me/newera_trading');
  const [instagramUrl, setInstagramUrl] = useState(initialSettings?.instagram_url || 'https://instagram.com/newera_trading');
  const [youtubeUrl, setYoutubeUrl] = useState(initialSettings?.youtube_url || 'https://youtube.com/@newera_trading');
  const [paymentWindow, setPaymentWindow] = useState(String(initialSettings?.payment_window_minutes ?? 15));
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialSettings?.payment_instructions ||
      "To'lovni quyidagi karta raqamlaridan biriga o'tkazing va chek skrinshotini yuklang. Admin 15 daqiqa ichida tekshiradi."
  );

  // XP Rewards State
  const [xpLesson, setXpLesson] = useState(String(initialSettings?.xp_lesson ?? 50));
  const [xpTest, setXpTest] = useState(String(initialSettings?.xp_test ?? 100));
  const [xpModule, setXpModule] = useState(String(initialSettings?.xp_module ?? 300));
  const [xpCourse, setXpCourse] = useState(String(initialSettings?.xp_course ?? 1000));

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const cards = [
        {
          id: 'card_humo',
          type: 'Humo',
          number: humoNumber.trim(),
          raw_number: humoNumber.replace(/\s+/g, ''),
          holder: cardHolder.trim(),
          is_primary: true,
        },
        {
          id: 'card_uzcard',
          type: 'Uzkart',
          number: uzkartNumber.trim(),
          raw_number: uzkartNumber.replace(/\s+/g, ''),
          holder: cardHolder.trim(),
          is_primary: false,
        },
        {
          id: 'card_visa',
          type: 'Visa',
          number: visaNumber.trim(),
          raw_number: visaNumber.replace(/\s+/g, ''),
          holder: cardHolder.trim(),
          is_primary: false,
        },
      ];

      const payload = {
        card_number: humoNumber.trim(),
        card_holder: cardHolder.trim(),
        cards,
        passing_score: Math.max(1, Math.min(100, parseInt(passingScore, 10) || 90)),
        watch_requirement: Math.max(1, Math.min(100, parseInt(watchRequirement, 10) || 90)),
        support_email: supportEmail.trim(),
        support_telegram: supportTelegram.trim(),
        telegram_channel_url: telegramChannel.trim(),
        instagram_url: instagramUrl.trim(),
        youtube_url: youtubeUrl.trim(),
        payment_window_minutes: Math.max(1, Math.min(180, parseInt(paymentWindow, 10) || 15)),
        payment_instructions: paymentInstructions.trim(),
        xp_lesson: Math.max(0, parseInt(xpLesson, 10) || 50),
        xp_test: Math.max(0, parseInt(xpTest, 10) || 100),
        xp_module: Math.max(0, parseInt(xpModule, 10) || 300),
        xp_course: Math.max(0, parseInt(xpCourse, 10) || 1000),
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sozlamalarni saqlashda xatolik yuz berdi');
      }

      toast.success('Barcha tizim sozlamalari va to‘lov kartalari muvaffaqiyatli saqlandi!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saqlashda xatolik');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-3xl font-black text-white tracking-tight">Platforma Sozlamalari</h1>
        <p className="text-white/50 text-sm mt-1">To‘lov rekvizitlari, Abbos Erkinov kartalari, test foizlari va XP mukofotlari.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Payment Cards Settings (Humo, Uzkart, Visa for Abbos Erkinov) */}
        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black">
                <CreditCard size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">To‘lov Kartalari & Rekvizitlar</h3>
                <p className="text-xs text-white/50">Checkout sahifasida talabalarga to‘lov uchun taqdim etiladigan 3 ta karta.</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Abbos Erkinov
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-mono">
            {/* Humo Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded text-[10px]">
                  HUMO
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Asosiy karta</span>
              </div>
              <label className="block text-white/70 uppercase text-[11px] font-bold">Karta Raqami</label>
              <input
                type="text"
                value={humoNumber}
                onChange={(e) => setHumoNumber(e.target.value)}
                placeholder="9860 1701 1477 2172"
                className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold tracking-wide focus:outline-none focus:border-pink-500 transition"
              />
            </div>

            {/* Uzkart Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded text-[10px]">
                  UZKART
                </span>
                <span className="text-[10px] text-white/40">O‘zbekiston</span>
              </div>
              <label className="block text-white/70 uppercase text-[11px] font-bold">Karta Raqami</label>
              <input
                type="text"
                value={uzkartNumber}
                onChange={(e) => setUzkartNumber(e.target.value)}
                placeholder="5614 6821 1727 0571"
                className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold tracking-wide focus:outline-none focus:border-pink-500 transition"
              />
            </div>

            {/* Visa Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded text-[10px]">
                  VISA
                </span>
                <span className="text-[10px] text-white/40">Xalqaro</span>
              </div>
              <label className="block text-white/70 uppercase text-[11px] font-bold">Karta Raqami</label>
              <input
                type="text"
                value={visaNumber}
                onChange={(e) => setVisaNumber(e.target.value)}
                placeholder="4023 0602 4867 3021"
                className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold tracking-wide focus:outline-none focus:border-pink-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono pt-2">
            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">Karta Egasi (Qabul qiluvchi Ism)</label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Abbos Erkinov"
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition uppercase font-bold tracking-wider"
              />
              <span className="text-[11px] text-white/40 mt-1 block">Ushbu ism barcha 3 ta kartaga biriktiriladi.</span>
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">To‘lov Kutilish Vaqti (Daqiqa)</label>
              <input
                type="number"
                min="5"
                max="180"
                value={paymentWindow}
                onChange={(e) => setPaymentWindow(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-white transition"
              />
              <span className="text-[11px] text-white/40 mt-1 block">Talaba chek yuklashi uchun ajratilgan standart vaqt (15 daqiqa).</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-white/70 uppercase mb-2 font-bold">To‘lov Yo‘riqnomasi</label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition text-xs font-sans"
              />
            </div>
          </div>
        </div>

        {/* 2. Education & Test Gates */}
        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">O‘quv Tizimi & Imtihon Chegaralari</h3>
              <p className="text-xs text-white/50">Darsni ochish va testdan o‘tish minimal mezonlari.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">Testdan o‘tish minimal bali (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-pink-500 transition"
              />
              <span className="text-[11px] text-emerald-400 mt-1 block font-bold">Qat&apos;iy talab: 90% to‘g‘ri javob talab etiladi.</span>
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">Videoni ko‘rish majburiy foizi (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={watchRequirement}
                onChange={(e) => setWatchRequirement(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-pink-500 transition"
              />
              <span className="text-[11px] text-emerald-400 mt-1 block font-bold">Dars videosining 90% ko‘rilgach test ochiladi.</span>
            </div>
          </div>
        </div>

        {/* 3. XP Gamification Rewards */}
        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">XP Mukofotlari & Gamifikatsiya</h3>
              <p className="text-xs text-white/50">Dars, test, modul va kurs yakunlanganda taqdim etiladigan tajriba ballari (XP).</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="block text-white/70 uppercase mb-1.5 font-bold">Dars XP</label>
              <input
                type="number"
                min="0"
                value={xpLesson}
                onChange={(e) => setXpLesson(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-1.5 font-bold">Test XP</label>
              <input
                type="number"
                min="0"
                value={xpTest}
                onChange={(e) => setXpTest(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-1.5 font-bold">Modul XP</label>
              <input
                type="number"
                min="0"
                value={xpModule}
                onChange={(e) => setXpModule(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-1.5 font-bold">Kurs XP</label>
              <input
                type="number"
                min="0"
                value={xpCourse}
                onChange={(e) => setXpCourse(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-white transition"
              />
            </div>
          </div>
        </div>

        {/* 4. Support & Contact Channels */}
        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black">
              <Headphones size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Qo‘llab-quvvatlash Kanallari</h3>
              <p className="text-xs text-white/50">Talabalar uchun texnik va to‘lov yordami ma&apos;lumotlari.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">Qo‘llab-quvvatlash Emaili</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@newera.uz"
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">Telegram Yordam Boti</label>
              <input
                type="text"
                value={supportTelegram}
                onChange={(e) => setSupportTelegram(e.target.value)}
                placeholder="https://t.me/newerasupport_bot"
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-white/70 uppercase mb-2 font-bold flex items-center justify-between">
                <span>Rasmiy Telegram Kanal Havolasi (Bosh sahifa va Footer uchun)</span>
                <span className="text-[10px] text-emerald-400 font-bold">Saytda doimiy ochiq turadi</span>
              </label>
              <input
                type="text"
                value={telegramChannel}
                onChange={(e) => setTelegramChannel(e.target.value)}
                placeholder="https://t.me/newera_trading"
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition font-bold"
              />
              <span className="text-[11px] text-white/40 mt-1 block">
                Saytning pastki qismida (footer) va bosh sahifada Instagram hamda YouTube kabi barcha foydalanuvchilar uchun har doim ochiq turadigan rasmiy Telegram kanal havolasi.
              </span>
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">Instagram Sahifa Havolasi</label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/newera_trading"
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="block text-white/70 uppercase mb-2 font-bold">YouTube Kanal Havolasi</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/@newera_trading"
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-xs font-mono text-white/40">
            <AlertCircle size={15} />
            O‘zgarishlar platformada darhol saqlanadi va aks etadi.
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saqlanmoqda...' : 'Sozlamalarni Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
