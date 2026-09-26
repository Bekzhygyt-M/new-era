'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Loader2, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

interface Trade {
  id: string;
  date: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: string;
  exitPrice: string;
  stopLoss?: string;
  takeProfit?: string;
  pnl: number;
  rr: string;
  status: 'WIN' | 'LOSS' | 'BREAKEVEN';
  strategy: string;
  screenshot_url?: string | null;
  note: string;
}

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  pair: '',
  type: 'BUY' as const,
  entryPrice: '',
  exitPrice: '',
  stopLoss: '',
  takeProfit: '',
  pnl: '',
  rr: '',
  strategy: '',
  note: '',
};

export default function JournalClient({ initialTrades }: { initialTrades: Trade[] }) {
  const { t } = useI18n();
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const stats = useMemo(() => {
    const wins = trades.filter((t) => t.status === 'WIN');
    const losses = trades.filter((t) => t.status === 'LOSS');
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

    return {
      total: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length ? Math.round((wins.length / trades.length) * 100) : 0,
      netPnl: trades.reduce((s, t) => s + t.pnl, 0),
      profitFactor: grossLoss ? (grossProfit / grossLoss).toFixed(2) : '—',
    };
  }, [trades]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pnl: Number(form.pnl) || 0 }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('common.saveFailed'));
        return;
      }

      setTrades((prev) => [data.trade, ...prev]);
      setForm(EMPTY);
      setOpen(false);
      toast.success(t('journal.tradeAdded'));
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const previous = trades;
    setTrades((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`/api/journal?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setTrades(previous);
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
          <h1 className="text-2xl font-black tracking-tight">Trading Journal</h1>
          <p className="mt-1 text-[13px] text-white/45">
            {t('journal.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
        >
          <Plus size={14} /> {t('journal.addTrade')}
        </button>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: t('journal.trades'), value: String(stats.total) },
          { label: 'Win Rate', value: `${stats.winRate}%` },
          { label: t('journal.wins'), value: String(stats.wins) },
          { label: t('journal.losses'), value: String(stats.losses) },
          { label: 'Profit Factor', value: String(stats.profitFactor) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="font-mono text-lg font-black text-white">{card.value}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
              {card.label}
            </div>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/35">Net P&L</span>
        <div
          className={`font-mono text-2xl font-black ${
            stats.netPnl > 0 ? 'text-emerald-400' : stats.netPnl < 0 ? 'text-red-400' : 'text-white'
          }`}
        >
          {stats.netPnl > 0 ? '+' : ''}
          {new Intl.NumberFormat('uz-UZ').format(stats.netPnl)}
        </div>
      </div>

      {/* Table */}
      {trades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-white/55">{t('journal.empty')}</p>
          <p className="mt-1.5 text-[13px] text-white/35">
            {t('journal.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                {['Sana', 'Instrument', 'Yo‘nalish', 'Entry', 'Exit', 'RR', 'P&L', 'Strategiya', ''].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="py-3 pr-4 text-[10px] font-black uppercase tracking-wider text-white/40"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const Icon =
                  trade.status === 'WIN' ? TrendingUp : trade.status === 'LOSS' ? TrendingDown : Minus;
                const tone =
                  trade.status === 'WIN'
                    ? 'text-emerald-400'
                    : trade.status === 'LOSS'
                      ? 'text-red-400'
                      : 'text-white/50';

                return (
                  <tr key={trade.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="py-3.5 pr-4 font-mono text-[12px] text-white/60">{trade.date}</td>
                    <td className="py-3.5 pr-4 text-[12.5px] font-bold text-white">{trade.pair}</td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-black ${
                          trade.type === 'BUY'
                            ? 'bg-emerald-400/15 text-emerald-300'
                            : 'bg-red-500/15 text-red-300'
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-[12px] text-white/60">{trade.entryPrice}</td>
                    <td className="py-3.5 pr-4 font-mono text-[12px] text-white/60">{trade.exitPrice}</td>
                    <td className="py-3.5 pr-4 font-mono text-[12px] text-white/60">{trade.rr || '—'}</td>
                    <td className={`py-3.5 pr-4 font-mono text-[12px] font-bold ${tone}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon size={12} />
                        {trade.pnl > 0 ? '+' : ''}
                        {new Intl.NumberFormat('uz-UZ').format(trade.pnl)}
                      </span>
                    </td>
                    <td className="max-w-[180px] truncate py-3.5 pr-4 text-[12px] text-white/45">
                      {trade.strategy || '—'}
                    </td>
                    <td className="py-3.5">
                      <button
                        type="button"
                        onClick={() => remove(trade.id)}
                        aria-label={t('journal.deleteTrade', { name: trade.pair })}
                        className="rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Yangi savdo yozuvi"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/12 bg-[#0b0b0b] p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">{t('journal.newTrade')}</h2>
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
              {field('date', t('journal.date'), { type: 'date', required: true })}

              <label className="block">
                <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">
                  Yo‘nalish
                </span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'BUY' })}
                  className="w-full rounded-xl border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </label>

              {field('pair', 'Instrument', { placeholder: 'EUR/USD', required: true })}
              {field('rr', 'Risk / Reward', { placeholder: '1:3' })}
              {field('entryPrice', 'Entry', { placeholder: '1.08420', required: true })}
              {field('exitPrice', 'Exit', { placeholder: '1.08950', required: true })}
              {field('stopLoss', 'Stop Loss', { placeholder: '1.08200' })}
              {field('takeProfit', 'Take Profit', { placeholder: '1.09100' })}
              {field('pnl', 'P&L', { type: 'number', step: 'any', placeholder: '530', required: true })}
              {field('strategy', t('journal.strategy'), { placeholder: 'SMC + Order Block' })}
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">
                Izoh
              </span>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
                placeholder="Nima uchun kirdingiz, nima o‘rgandingiz?"
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
