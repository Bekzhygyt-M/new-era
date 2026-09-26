'use client';

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, Award, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
  vol: number;
}

const CANDLE_W = 12;
const CANDLE_GAP = 7;
const MAX_CANDLES = 18;
const SVG_H = 170;

interface SymbolConfig {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number;
  decimals: number;
  high: number;
  low: number;
  volume: string;
}

const CHART_TEXT = {
  uz: {
    confirmed: 'Tasdiqlandi',
    challengeResult: 'PROP CHALLENGE NATIJA',
    successful: 'Muvaffaqiyatli ✓',
    high24: '24H YUQORI',
    low24: '24H PAST',
    volume24: 'HAJM (24H)',
  },
  ru: {
    confirmed: 'Подтверждено',
    challengeResult: 'РЕЗУЛЬТАТ ЧЕЛЛЕНДЖА',
    successful: 'Успешно ✓',
    high24: '24Ч МАКС',
    low24: '24Ч МИН',
    volume24: 'ОБЪЕМ (24Ч)',
  },
  en: {
    confirmed: 'Confirmed',
    challengeResult: 'PROP CHALLENGE RESULT',
    successful: 'Passed ✓',
    high24: '24H HIGH',
    low24: '24H LOW',
    volume24: 'VOLUME (24H)',
  },
};

const SYMBOLS: Record<string, SymbolConfig> = {
  XAUUSD: {
    symbol: 'XAU/USD',
    name: 'XAU/USD · GOLD SPOT',
    basePrice: 2934.50,
    volatility: 1.25,
    decimals: 2,
    high: 2948.80,
    low: 2916.20,
    volume: '38.4B',
  },
  EURUSD: {
    symbol: 'EUR/USD',
    name: 'EUR/USD · EURO / US DOLLAR',
    basePrice: 1.0845,
    volatility: 0.0012,
    decimals: 4,
    high: 1.0890,
    low: 1.0815,
    volume: '84.2B',
  },
  BTCUSD: {
    symbol: 'BTC/USD',
    name: 'BTC/USD · BITCOIN SPOT',
    basePrice: 94250.00,
    volatility: 180.0,
    decimals: 2,
    high: 95800.00,
    low: 93400.00,
    volume: '52.1B',
  },
};

function buildPath(candles: Candle[], svgH: number) {
  const pad = { top: 22, bottom: 22 };
  if (candles.length === 0) return { line: '', area: '', items: [] };

  const vals = candles.flatMap((c) => [c.high, c.low]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = Math.max(maxV - minV, 0.00001);

  const usableH = svgH - pad.top - pad.bottom;

  const toY = (v: number) => pad.top + usableH - ((v - minV) / range) * usableH;
  const toX = (i: number) => i * (CANDLE_W + CANDLE_GAP) + CANDLE_W / 2;

  const line = candles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(c.close)}`).join(' ');
  const area = `${line} L ${toX(candles.length - 1)} ${svgH} L ${toX(0)} ${svgH} Z`;

  const items = candles.map((c, i) => {
    const isBull = c.close >= c.open;
    const bodyTop = toY(Math.max(c.open, c.close));
    const bodyBot = toY(Math.min(c.open, c.close));
    const bodyH = Math.max(bodyBot - bodyTop, 2.5);
    return {
      x: i * (CANDLE_W + CANDLE_GAP),
      bodyTop,
      bodyH,
      wickTop: toY(c.high),
      wickBot: toY(c.low),
      isBull,
      vol: c.vol,
    };
  });

  return { line, area, items };
}

function generateInitialCandles(base: number, vol: number): Candle[] {
  const list: Candle[] = [];
  let p = base - vol * 6;
  for (let i = 0; i < MAX_CANDLES; i++) {
    const open = p;
    const step = (Math.random() - 0.47) * vol * 2.5;
    const close = open + step;
    const high = Math.max(open, close) + Math.random() * vol * 1.2;
    const low = Math.min(open, close) - Math.random() * vol * 1.2;
    list.push({ open, close, high, low, vol: Math.floor(Math.random() * 80 + 20) });
    p = close;
  }
  return list;
}

export default function MarketChart() {
  const { locale } = useI18n();
  const cText = CHART_TEXT[locale] || CHART_TEXT.uz;
  const [activeSymbol, setActiveSymbol] = useState<'XAUUSD' | 'EURUSD' | 'BTCUSD'>('XAUUSD');
  const [timeframe, setTimeframe] = useState<'1M' | '5M' | '15M' | '1H'>('15M');
  const cfg = SYMBOLS[activeSymbol];

  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(cfg.basePrice);
  const [priceChange, setPriceChange] = useState<{ text: string; isPos: boolean }>({
    text: '+1.85%',
    isPos: true,
  });
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  // Re-initialize candles on symbol change
  useEffect(() => {
    const init = generateInitialCandles(cfg.basePrice, cfg.volatility);
    setCandles(init);
    const last = init[init.length - 1];
    setCurrentPrice(last.close);
  }, [activeSymbol, cfg.basePrice, cfg.volatility]);

  // Live real-time price action simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const last = updated[lastIdx];

        const delta = (Math.random() - 0.48) * cfg.volatility * 1.2;
        const newClose = +(last.close + delta).toFixed(cfg.decimals);
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);

        updated[lastIdx] = {
          open: last.open,
          close: newClose,
          high: newHigh,
          low: newLow,
          vol: last.vol + Math.floor(Math.random() * 5),
        };

        setFlash(delta >= 0 ? 'up' : 'down');
        setTimeout(() => setFlash(null), 350);

        setCurrentPrice(newClose);

        const first = updated[0].open;
        const pct = (((newClose - first) / first) * 100).toFixed(2);
        const isPos = +pct >= 0;
        setPriceChange({
          text: `${isPos ? '+' : ''}${pct}%`,
          isPos,
        });

        return updated;
      });
    }, 1600);

    return () => clearInterval(interval);
  }, [cfg.decimals, cfg.volatility]);

  const { area, items } = useMemo(() => buildPath(candles, SVG_H), [candles]);

  const formatPrice = (val: number, dec: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    }).format(val);
  };

  return (
    <div className="relative w-full max-w-[560px] mx-auto select-none py-6 sm:py-8 px-2 sm:px-4">
      {/* Animated Floating Card 1: Top-Left (SMC Confirmation with Pink Accent) */}
      <div className="absolute -top-1 -left-2 sm:-top-2 sm:-left-6 z-20 pointer-events-none">
        <div className="bg-[#0e0e12]/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400 shrink-0">
            <Zap size={18} className="fill-pink-500 text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-pink-400/80 uppercase">
                SMC ENTRY MODEL
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1">
              Order Block + FVG <CheckCircle2 size={13} className="text-emerald-400 inline" />
            </div>
            <div className="text-[10px] font-mono text-white/60">
              Risk:Reward <span className="text-emerald-400 font-bold">1:4.2</span> · {cText.confirmed}
            </div>
          </div>
        </div>
      </div>

      {/* Animated Floating Card 2: Bottom-Right (Prop Challenge Passed with Green Accent) */}
      <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-6 z-20 pointer-events-none">
        <div className="bg-[#0e0e12]/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Award size={18} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400/80 uppercase block">
              {cText.challengeResult}
            </span>
            <div className="text-xs sm:text-sm font-black text-white tracking-tight">
              $100,000 FUNDED ACCOUNT
            </div>
            <div className="text-[10px] font-mono text-white/60">
              Win Rate: <span className="text-emerald-400 font-bold">89.4%</span> · {cText.successful}
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Card */}
      <div className="relative rounded-3xl overflow-hidden bg-[#070709] border border-white/15 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-px bg-gradient-to-r from-transparent via-pink-500/60 to-transparent" />

        {/* Top bar with Symbol Switcher */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-black/60">
          {/* Symbols */}
          <div className="flex items-center gap-1.5">
            {(['XAUUSD', 'EURUSD', 'BTCUSD'] as const).map((sym) => (
              <button
                key={sym}
                onClick={() => setActiveSymbol(sym)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  activeSymbol === sym
                    ? 'bg-white text-black font-black shadow'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {sym === 'XAUUSD' ? 'GOLD' : sym === 'BTCUSD' ? 'BTC' : 'EUR'}
              </button>
            ))}
          </div>

          {/* Timeframes */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-white/50 font-bold">
            {(['1M', '5M', '15M', '1H'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-1.5 py-0.5 rounded transition ${
                  timeframe === tf ? 'text-pink-400 font-black' : 'hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Price display & Live Ticker */}
        <div className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="text-xs font-mono text-white/50 block mb-1">
                {cfg.name}
              </span>
              <span 
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight transition-colors duration-200 ${
                  flash === 'up' 
                    ? 'text-emerald-400' 
                    : flash === 'down' 
                      ? 'text-pink-400' 
                      : 'text-white'
                }`}
              >
                ${formatPrice(currentPrice, cfg.decimals)}
              </span>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-mono font-bold shadow-sm ${
              priceChange.isPos 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-pink-500/10 border-pink-500/30 text-pink-400'
            }`}>
              {priceChange.isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{priceChange.text}</span>
            </div>
          </div>

          {/* Real Candlestick Chart Area (Green / Pink Candlesticks) */}
          <div className="relative h-[170px] w-full bg-black/90 rounded-2xl border border-white/10 overflow-hidden p-2">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-4 px-2 opacity-15">
              <div className="border-b border-dashed border-white w-full" />
              <div className="border-b border-dashed border-white w-full" />
              <div className="border-b border-dashed border-white w-full" />
            </div>

            {candles.length > 0 && (
              <svg 
                className="w-full h-full relative z-10" 
                viewBox={`0 0 ${MAX_CANDLES * (CANDLE_W + CANDLE_GAP)} ${SVG_H}`} 
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="liveChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Shaded Area */}
                <path d={area} fill="url(#liveChartGrad)" />

                {/* Candlesticks: Green = Bullish (#00E676), Pink/Red = Bearish (#EC4899) */}
                {items.map((item, idx) => {
                  const isLatest = idx === items.length - 1;
                  const candleColor = item.isBull ? '#00E676' : '#EC4899';
                  const wickColor = item.isBull ? '#00E676' : '#EC4899';

                  return (
                    <g key={idx}>
                      {/* Upper & Lower Wick */}
                      <line
                        x1={item.x + CANDLE_W / 2}
                        y1={item.wickTop}
                        x2={item.x + CANDLE_W / 2}
                        y2={item.wickBot}
                        stroke={wickColor}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      {/* Real Body */}
                      <rect
                        x={item.x}
                        y={item.bodyTop}
                        width={CANDLE_W}
                        height={item.bodyH}
                        rx="1.5"
                        fill={candleColor}
                        stroke={candleColor}
                        strokeWidth="1"
                        className={isLatest ? 'transition-all duration-300' : ''}
                      />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Meta metrics */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10 text-center font-mono">
            <div>
              <span className="text-[10px] text-white/40 block">{cText.high24}</span>
              <span className="text-xs text-white/90 font-bold">
                ${formatPrice(Math.max(cfg.high, currentPrice), cfg.decimals)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 block">{cText.low24}</span>
              <span className="text-xs text-white/90 font-bold">
                ${formatPrice(Math.min(cfg.low, currentPrice), cfg.decimals)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 block">{cText.volume24}</span>
              <span className="text-xs text-emerald-400 font-bold">${cfg.volume}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
