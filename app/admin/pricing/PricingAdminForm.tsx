'use client';

import { useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface TariffPricingTier {
  daily: number;
  monthly: number;
  yearly: number;
}

interface PricingTiersSettings {
  standard: TariffPricingTier;
  pro: TariffPricingTier;
}

interface PricingAdminFormProps {
  initialTiers: PricingTiersSettings;
}

export default function PricingAdminForm({ initialTiers }: PricingAdminFormProps) {
  const [tiers, setTiers] = useState<PricingTiersSettings>(initialTiers);
  const [loading, setLoading] = useState(false);

  const handlePriceChange = (
    tariff: 'standard' | 'pro',
    period: 'daily' | 'monthly' | 'yearly',
    value: string
  ) => {
    const num = Math.max(0, parseInt(value || '0', 10));
    setTiers((prev) => ({
      ...prev,
      [tariff]: {
        ...prev[tariff],
        [period]: num,
      },
    }));
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + " so'm";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing_tiers: tiers }),
      });

      if (!res.ok) {
        throw new Error("Narxlarni saqlashda xatolik yuz berdi");
      }

      toast.success("Tarif narxlari muvaffaqiyatli saqlandi!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Standart Tariff Pricing */}
        <div className="rounded-3xl border border-white/12 bg-white/[0.02] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥉</span>
              <div>
                <h2 className="text-xl font-black text-white">STANDART Tarif</h2>
                <p className="text-xs font-semibold text-white/50">Trading nima, MT5, Forex, Brokerlar, Prop firmalar & ICT</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white border border-white/15 uppercase">
              STANDART
            </span>
          </div>

          <div className="space-y-4">
            {/* Daily */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-white/70 uppercase">
                📅 Kunlik Narx (UZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={tiers.standard.daily}
                  onChange={(e) => handlePriceChange('standard', 'daily', e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm font-mono font-bold text-white focus:border-white focus:outline-none"
                  placeholder="15000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  {formatMoney(tiers.standard.daily)} / kun
                </span>
              </div>
            </div>

            {/* Monthly */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-white/70 uppercase">
                🗓️ Oylik Narx (UZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={tiers.standard.monthly}
                  onChange={(e) => handlePriceChange('standard', 'monthly', e.target.value)}
                  className="w-full rounded-xl border border-emerald-500/40 bg-black/60 px-4 py-3 text-sm font-mono font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
                  placeholder="299000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400/60 font-bold">
                  {formatMoney(tiers.standard.monthly)} / oy
                </span>
              </div>
            </div>

            {/* Yearly */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-white/70 uppercase">
                🏆 Yillik Narx (UZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={tiers.standard.yearly}
                  onChange={(e) => handlePriceChange('standard', 'yearly', e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm font-mono font-bold text-white focus:border-white focus:outline-none"
                  placeholder="2490000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  {formatMoney(tiers.standard.yearly)} / yil
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tariff Pricing */}
        <div className="rounded-3xl border border-purple-500/30 bg-purple-500/[0.02] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥈</span>
              <div>
                <h2 className="text-xl font-black text-white">PRO Tarif</h2>
                <p className="text-xs font-semibold text-purple-300/70">Strategiyalar, AMD, SNR, SMS, Fibonacci & Psixologiya</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              🔥 ENG MASHHUR
            </span>
          </div>

          <div className="space-y-4">
            {/* Daily */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-purple-300/80 uppercase">
                📅 Kunlik Narx (UZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={tiers.pro.daily}
                  onChange={(e) => handlePriceChange('pro', 'daily', e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm font-mono font-bold text-white focus:border-purple-400 focus:outline-none"
                  placeholder="25000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  {formatMoney(tiers.pro.daily)} / kun
                </span>
              </div>
            </div>

            {/* Monthly */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-purple-300/80 uppercase">
                🗓️ Oylik Narx (UZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={tiers.pro.monthly}
                  onChange={(e) => handlePriceChange('pro', 'monthly', e.target.value)}
                  className="w-full rounded-xl border border-pink-500/40 bg-black/60 px-4 py-3 text-sm font-mono font-bold text-pink-400 focus:border-pink-400 focus:outline-none"
                  placeholder="599000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-pink-400/60 font-bold">
                  {formatMoney(tiers.pro.monthly)} / oy
                </span>
              </div>
            </div>

            {/* Yearly */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-purple-300/80 uppercase">
                🏆 Yillik Narx (UZS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={tiers.pro.yearly}
                  onChange={(e) => handlePriceChange('pro', 'yearly', e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm font-mono font-bold text-white focus:border-purple-400 focus:outline-none"
                  placeholder="4990000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">
                  {formatMoney(tiers.pro.yearly)} / yil
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-xs font-black uppercase tracking-wider text-black transition hover:bg-neutral-200 disabled:opacity-50 font-mono shadow-xl"
        >
          {loading ? (
            <>
              <RefreshCw size={15} className="animate-spin" /> SAQLANMOQDA...
            </>
          ) : (
            <>
              <Check size={15} /> NARXLARNI SAQLASH
            </>
          )}
        </button>
      </div>
    </form>
  );
}
