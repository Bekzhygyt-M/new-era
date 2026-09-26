import type {
  LocalJournalTrade,
  LocalBacktest,
  LocalNotification,
  AdminSettings,
} from '@/lib/local-db';

/**
 * Row mappers.
 *
 * The application model and the SQL schema deliberately differ in a few places
 * (camelCase fields in the journal and backtest models, `user_id: 'all'` for a
 * broadcast). Everything that crosses that boundary is translated here so no
 * call site has to know which backend it is talking to.
 */

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (v === null || v === undefined ? fallback : Number(v));

// ─── Journal ────────────────────────────────────────────────────────────────

export function journalFromRow(row: Row): LocalJournalTrade {
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    date: str(row.trade_date),
    pair: str(row.pair),
    type: row.direction === 'SELL' ? 'SELL' : 'BUY',
    entryPrice: str(row.entry_price),
    exitPrice: str(row.exit_price),
    stopLoss: row.stop_loss == null ? undefined : str(row.stop_loss),
    takeProfit: row.take_profit == null ? undefined : str(row.take_profit),
    pnl: num(row.pnl),
    rr: str(row.rr),
    status: (row.status as LocalJournalTrade['status']) || 'BREAKEVEN',
    strategy: str(row.strategy),
    screenshot_url: (row.screenshot_url as string | null) ?? null,
    note: str(row.note),
    created_at: str(row.created_at),
  };
}

export function journalToRow(trade: Partial<LocalJournalTrade> & { user_id: string }): Row {
  const row: Row = { user_id: trade.user_id };
  if (trade.date !== undefined) row.trade_date = trade.date;
  if (trade.pair !== undefined) row.pair = trade.pair;
  if (trade.type !== undefined) row.direction = trade.type;
  if (trade.entryPrice !== undefined) row.entry_price = trade.entryPrice;
  if (trade.exitPrice !== undefined) row.exit_price = trade.exitPrice;
  if (trade.stopLoss !== undefined) row.stop_loss = trade.stopLoss;
  if (trade.takeProfit !== undefined) row.take_profit = trade.takeProfit;
  if (trade.pnl !== undefined) row.pnl = trade.pnl;
  if (trade.rr !== undefined) row.rr = trade.rr;
  if (trade.status !== undefined) row.status = trade.status;
  if (trade.strategy !== undefined) row.strategy = trade.strategy;
  if (trade.screenshot_url !== undefined) row.screenshot_url = trade.screenshot_url;
  if (trade.note !== undefined) row.note = trade.note;
  return row;
}

// ─── Backtests ──────────────────────────────────────────────────────────────

export function backtestFromRow(row: Row): LocalBacktest {
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    module_id: (row.module_id as string | null) ?? null,
    name: str(row.name),
    instrument: str(row.instrument),
    timeframe: str(row.timeframe),
    totalTrades: num(row.total_trades),
    wins: num(row.wins),
    losses: num(row.losses),
    winRate: num(row.win_rate),
    rr: str(row.rr),
    pnlPercent: num(row.pnl_percent),
    maxDD: str(row.max_dd),
    profitFactor: str(row.profit_factor),
    screenshot_url: (row.screenshot_url as string | null) ?? null,
    notes: str(row.notes),
    created_at: str(row.created_at),
  };
}

export function backtestToRow(bt: Partial<LocalBacktest> & { user_id: string }): Row {
  const row: Row = { user_id: bt.user_id };
  if (bt.module_id !== undefined) row.module_id = bt.module_id;
  if (bt.name !== undefined) row.name = bt.name;
  if (bt.instrument !== undefined) row.instrument = bt.instrument;
  if (bt.timeframe !== undefined) row.timeframe = bt.timeframe;
  if (bt.totalTrades !== undefined) row.total_trades = bt.totalTrades;
  if (bt.wins !== undefined) row.wins = bt.wins;
  if (bt.losses !== undefined) row.losses = bt.losses;
  if (bt.winRate !== undefined) row.win_rate = bt.winRate;
  if (bt.rr !== undefined) row.rr = bt.rr;
  if (bt.pnlPercent !== undefined) row.pnl_percent = bt.pnlPercent;
  if (bt.maxDD !== undefined) row.max_dd = bt.maxDD;
  if (bt.profitFactor !== undefined) row.profit_factor = bt.profitFactor;
  if (bt.screenshot_url !== undefined) row.screenshot_url = bt.screenshot_url;
  if (bt.notes !== undefined) row.notes = bt.notes;
  return row;
}

// ─── Notifications ──────────────────────────────────────────────────────────
// A broadcast is user_id = NULL in SQL and the sentinel 'all' in the model.

export function notificationFromRow(row: Row): LocalNotification {
  return {
    id: str(row.id),
    user_id: (row.user_id as string | null) ?? 'all',
    title: str(row.title),
    message: str(row.message),
    type: str(row.type, 'system'),
    link: (row.link as string | null) ?? null,
    read: Boolean(row.read),
    created_at: str(row.created_at),
  };
}

export function notificationToRow(n: Partial<LocalNotification>): Row {
  const row: Row = {};
  if (n.user_id !== undefined) row.user_id = n.user_id === 'all' ? null : n.user_id;
  if (n.title !== undefined) row.title = n.title;
  if (n.message !== undefined) row.message = n.message;
  if (n.type !== undefined) row.type = n.type;
  if (n.link !== undefined) row.link = n.link;
  if (n.read !== undefined) row.read = n.read;
  return row;
}

// ─── Settings (single row) ──────────────────────────────────────────────────

export function settingsFromRow(row: Row | null, defaults: AdminSettings): AdminSettings {
  if (!row) return { ...defaults };
  return {
    passing_score: num(row.passing_score, defaults.passing_score),
    watch_requirement: num(row.watch_requirement, defaults.watch_requirement),
    xp_lesson: num(row.xp_lesson, defaults.xp_lesson),
    xp_test: num(row.xp_test, defaults.xp_test),
    xp_module: num(row.xp_module, defaults.xp_module),
    xp_course: num(row.xp_course, defaults.xp_course),
    payment_window_minutes: num(row.payment_window_minutes, defaults.payment_window_minutes),
    currency: str(row.currency, defaults.currency),
    support_telegram: str(row.support_telegram, defaults.support_telegram),
    support_email: str(row.support_email, defaults.support_email),
    payment_instructions: str(row.payment_instructions, defaults.payment_instructions),
    card_number: str(row.card_number, defaults.card_number),
    card_holder: str(row.card_holder, defaults.card_holder),
    cards: Array.isArray(row.cards) ? (row.cards as AdminSettings['cards']) : defaults.cards,
    pricing: row.pricing ? (row.pricing as AdminSettings['pricing']) : defaults.pricing,
    course_limit_days: num(row.course_limit_days, defaults.course_limit_days ?? 30),
    instagram_url: str(row.instagram_url, defaults.instagram_url ?? ''),
    telegram_channel_url: str(row.telegram_channel_url, defaults.telegram_channel_url ?? ''),
    youtube_url: str(row.youtube_url, defaults.youtube_url ?? ''),
    level_thresholds: Array.isArray(row.level_thresholds)
      ? (row.level_thresholds as AdminSettings['level_thresholds'])
      : defaults.level_thresholds,
  };
}

/** Strips undefined so a partial update never nulls a column by accident. */
export function defined(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}
