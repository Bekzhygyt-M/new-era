'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Tag, 
  Clock, 
  CreditCard, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface CardDetail {
  id: string;
  type: string;
  number: string;
  raw_number: string;
  holder: string;
  is_primary?: boolean;
}

interface PricingPeriod {
  daily: number;
  monthly: number;
  yearly: number;
}

interface AdminPricingClientProps {
  initialPricing: {
    standard: PricingPeriod;
    pro: PricingPeriod;
  };
  initialCourseLimitDays: number;
  initialCards: CardDetail[];
}

export default function AdminPricingClient({
  initialPricing,
  initialCourseLimitDays,
  initialCards,
}: AdminPricingClientProps) {
  const [pricing, setPricing] = useState(initialPricing);
  const [limitDays, setLimitDays] = useState(initialCourseLimitDays || 30);
  const [cards, setCards] = useState<CardDetail[]>(initialCards);
  const [saving, setSaving] = useState(false);

  const handlePricingChange = (
    tier: 'standard' | 'pro',
    period: 'daily' | 'monthly' | 'yearly',
    value: string
  ) => {
    const num = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setPricing((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [period]: num,
      },
    }));
  };

  const handleCardChange = (index: number, field: keyof CardDetail, value: string) => {
    setCards((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
        ...(field === 'number' ? { raw_number: value.replace(/\s+/g, '') } : {}),
      };
      return copy;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing,
          course_limit_days: limitDays,
          cards,
          standard_price: pricing.standard.monthly,
          pro_price: pricing.pro.monthly,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Saqlashda xatolik yuz berdi');
        return;
      }

      toast.success('Barcha narxlar, dars limiti va kartalar muvaffaqiyatli saqlandi!');
    } catch {
      toast.error('Tarmoq xatosi, qayta urinib ko‘ring');
    } finally {
      setSaving(false);
    }
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} /> Narxlar & Tariflar
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tariflarni Boshqarish</h1>
          <p className="text-white/50 text-sm mt-1">
            Standart va Pro tariflari uchun kunlik, oylik (30 kun) va yillik narxlar hamda to‘lov kartalarini boshqarish.
          </p>
        </div>

        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition shadow-xl disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}
        </button>
      </div>

      {/* 30 Kunlik Kurs Limiti Banner */}
      <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-zinc-900 to-black p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              Dars Limiti (Avtomatik Amal Qilish Muddati)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                30 kunlik tizim
              </span>
            </h3>
            <p className="text-xs text-white/60 leading-relaxed max-w-xl">
              Foydalanuvchi kursni sotib olgan kundan boshlab belgilangan kunlar soni avtomatik hisoblanadi. 
              Muddati tugagandan so‘ng foydalanuvchining darslarga kirishi avtomatik yopiladi va kabinetida qolgan kunlar ko‘rsatib boriladi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/60 border border-white/15 px-4 py-3 rounded-xl shrink-0">
          <label className="text-xs font-mono font-bold text-white/70">Muddati (kun):</label>
          <input
            type="number"
            min={1}
            max={365}
            value={limitDays}
            onChange={(e) => setLimitDays(parseInt(e.target.value, 10) || 30)}
            className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-center text-sm font-mono font-black text-white focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Standart & Pro Tarif Narxlari */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* STANDART CARD */}
        <div className="rounded-2xl border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🥉</span>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide">STANDART TARIF</h2>
                <span className="text-[11px] font-mono text-white/40">0 dan boshlovchilar uchun</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold uppercase">
              Asosiy: {formatNumber(pricing.standard.monthly)} so‘m
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5">
                Kunlik Tarif Narxi (so‘m)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(pricing.standard.daily)}
                  onChange={(e) => handlePricingChange('standard', 'daily', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-pink-500 transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  so‘m / kun
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5 flex items-center justify-between">
                <span>Oylik Tarif (30 kun) — Asosiy</span>
                <span className="text-emerald-400 text-[10px]">Tavsiya etilgan: 299 000 so‘m</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(pricing.standard.monthly)}
                  onChange={(e) => handlePricingChange('standard', 'monthly', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-xl px-4 py-3 text-base font-mono font-black text-white focus:outline-none focus:border-pink-500 transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  so‘m / 30 kun
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5">
                Yillik Tarif Narxi (365 kun)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(pricing.standard.yearly)}
                  onChange={(e) => handlePricingChange('standard', 'yearly', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-pink-500 transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  so‘m / yil
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PRO CARD */}
        <div className="rounded-2xl border border-pink-500/30 bg-[#0a0a0a] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🥈</span>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide">PRO TARIF</h2>
                <span className="text-[11px] font-mono text-pink-400">Professional strategiyalar</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold uppercase">
              Asosiy: {formatNumber(pricing.pro.monthly)} so‘m
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5">
                Kunlik Tarif Narxi (so‘m)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(pricing.pro.daily)}
                  onChange={(e) => handlePricingChange('pro', 'daily', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-pink-500 transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  so‘m / kun
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5 flex items-center justify-between">
                <span>Oylik Tarif (30 kun) — Asosiy</span>
                <span className="text-emerald-400 text-[10px]">Tavsiya etilgan: 499 000 so‘m</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(pricing.pro.monthly)}
                  onChange={(e) => handlePricingChange('pro', 'monthly', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-xl px-4 py-3 text-base font-mono font-black text-white focus:outline-none focus:border-pink-500 transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  so‘m / 30 kun
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5">
                Yillik Tarif Narxi (365 kun)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(pricing.pro.yearly)}
                  onChange={(e) => handlePricingChange('pro', 'yearly', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-pink-500 transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  so‘m / yil
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real To'lov Kartalari Boshqaruvi (Humo, Uzkart, Visa) */}
      <div className="rounded-2xl border border-white/15 bg-[#080808] p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
            <CreditCard size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">To‘lov Kartalari Rekvizitlari</h2>
            <p className="text-xs text-white/50">Foydalanuvchilar to‘lov qilganda ko‘rinadigan rasmiy karta raqamlari.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card, idx) => (
            <div key={card.id || idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black uppercase text-pink-400 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                  {card.type}
                </span>
                <span className="text-[10px] font-mono text-white/40">Karta #{idx + 1}</span>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">
                  Karta raqami:
                </label>
                <input
                  type="text"
                  value={card.number}
                  onChange={(e) => handleCardChange(idx, 'number', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">
                  Karta egasi:
                </label>
                <input
                  type="text"
                  value={card.holder}
                  onChange={(e) => handleCardChange(idx, 'holder', e.target.value)}
                  className="w-full bg-[#111111] border border-white/15 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
