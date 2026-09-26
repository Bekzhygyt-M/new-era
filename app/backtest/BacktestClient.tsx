'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Loader2, X, LineChart } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

interface Backtest {
  id: string;
  name: string;
  instrument: string;
  timeframe: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  rr: string;
  pnlPercent: number;
  maxDD: string;
  profitFactor: string;
  notes: string;
  created_at: string;
}

const TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', '1D'];

const EMPTY = {
  name: '',
  instrument: '',
  timeframe: '15M',
  totalTrades: '',
  wins: '',
  rr: '',
  pnlPercent: '',
  maxDD: '',
  profitFactor: '',
  notes: '',
};

export default function BacktestClient({ initialBacktests }: { initialBacktests: Backtest[] }) {
  const { t } = useI18n();
  const [backtests, setBacktests] = useState<Backtest[]>(initialBacktests);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const summary = useMemo(() => {
    const totalTrades = backtests.reduce((s, b) => s + b.totalTrades, 0);
    const totalWins = backtests.reduce((s, b) => s + b.wins, 0);

    return {
      count: backtests.length,
      totalTrades,
      averageWinRate: totalTrades ? Math.round((totalWins / totalTrades) * 100) : 0,
      bestWinRate: backtests.reduce((best, b) => Math.max(best, b.winRate), 0),
    };
  }, [backtests]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const totalTrades = Number(form.totalTrades) || 0;
    const wins = Number(form.wins) || 0;

    if (wins > totalTrades) {
      toast.error(t('backtest.winsTooMany'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          totalTrades,
          wins,
          pnlPercent: Number(form.pnlPercent) || 0,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('common.saveFailed'));
        return;
      }

      setBacktests((prev) => [data.backtest, ...prev]);
      setForm(EMPTY);
      setOpen(false);
      toast.success(t('backtest.saved'));
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const previous = backtests;
    setBacktests((prev) => prev.filter((b) => b.id !== id));

    try {
      const res = await fetch(`/api/backtest?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setBacktests(previous);
      toast.error(t('common.deleteFailed'));
    }
  };

  const field = (
    name: keyof typeof EMPTY,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">
        {label}
      </span>
      <input
        value={form[name] as string}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full rounded-xl border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
        {...props}
      />
    </label>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Backtest</h1>
          <p className="mt-1 text-[13px] text-white/45">
            {t('backtest.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
        >
          <Plus size={14} /> {t('backtest.add')}
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t('backtest.list'), value: String(summary.count) },
          { label: t('backtest.totalTrades'), value: String(summary.totalTrades) },
          { label: t('backtest.avgWinRate'), value: `${summary.averageWinRate}%` },
          { label: t('backtest.bestWinRate'), value: `${summary.bestWinRate}%` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="font-mono text-lg font-black text-white">{card.value}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
              {card.label}
            </div>
          </div>
        ))}
      </section>

      {backtests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-6 py-16 text-center">
          <LineChart size={24} className="mx-auto mb-3 text-white/25" />
          <p className="text-sm font-semibold text-white/55">{t('backtest.empty')}</p>
          <p className="mt-1.5 text-[13px] text-white/35">
            {t('backtest.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {backtests.map((backtest) => (
            <article key={backtest.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-white">{backtest.name}</h2>
                  <p className="mt-0.5 text-[11.5px] text-white/40">
                    {backtest.instrument} · {backtest.timeframe}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => remove(backtest.id)}
                  aria-label={t('backtest.deleteBacktest', { name: backtest.name })}
                  className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-3">
                <div>
                  <div className="font-mono text-lg font-black text-white">{backtest.winRate}%</div>
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-white/30">
                    Win Rate
                  </div>
                </div>
                <div>
                  <div className="font-mono text-lg font-black text-white">{backtest.totalTrades}</div>
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-white/30">
                    {t('journal.tradesLabel')}
                  </div>
                </div>
                <div>
                  <div
                    className={`font-mono text-lg font-black ${
                      backtest.pnlPercent > 0
                        ? 'text-emerald-400'
                        : backtest.pnlPercent < 0
                          ? 'text-red-400'
                          : 'text-white'
                    }`}
                  >
                    {backtest.pnlPercent > 0 ? '+' : ''}
                    {backtest.pnlPercent}%
                  </div>
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-white/30">P&L</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
                <span>W/L: {backtest.wins}/{backtest.losses}</span>
                {backtest.rr && <span>RR: {backtest.rr}</span>}
                {backtest.maxDD && <span>Max DD: {backtest.maxDD}</span>}
                {backtest.profitFactor && <span>PF: {backtest.profitFactor}</span>}
              </div>

              {backtest.notes && (
                <p className="mt-3 border-t border-white/[0.06] pt-3 text-[12px] leading-relaxed text-white/50">
                  {backtest.notes}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('backtest.newBacktest')}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/12 bg-[#0b0b0b] p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">{t('backtest.newBacktest')}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Yopish"
                className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {field('name', 'Nomi', { placeholder: 'SMC 15m Killzone', required: true })}
              {field('instrument', 'Instrument', { placeholder: 'EUR/USD', required: true })}

              <label className="block">
                <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">
                  Timeframe
                </span>
                <select
                  value={form.timeframe}
                  onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf}
                    </option>
                  ))}
                </select>
              </label>

              {field('rr', 'Risk / Reward', { placeholder: '1:3' })}
              {field('totalTrades', t('backtest.totalTrades'), { type: 'number', min: 1, required: true })}
              {field('wins', 'Yutuqlar', { type: 'number', min: 0, required: true })}
              {field('pnlPercent', 'P&L (%)', { type: 'number', step: 'any', placeholder: '48.5' })}
              {field('maxDD', 'Max Drawdown', { placeholder: '4.2%' })}
              {field('profitFactor', 'Profit Factor', { placeholder: '2.8' })}
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">
                Xulosa
              </span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
                placeholder="Strategiya qayerda ishladi, qayerda ishlamadi?"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Saqlash
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
