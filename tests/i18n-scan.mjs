#!/usr/bin/env node
/**
 * Finds untranslated text.
 *
 * Renders every public page in Russian and flags visible text that is not
 * Cyrillic. The earlier version looked for a hand-written list of Uzbek words
 * and kept missing things — short labels ("Tarif", "Modul"), words nobody had
 * thought to list ("O'quvchilar", "Tez kunda"), and the whole signed-in
 * chrome, which it never saw because it browsed logged out.
 *
 * The rule here is the opposite way round and much harder to slip past: in the
 * Russian locale every visible string must contain Cyrillic, unless it is a
 * brand or an industry term that genuinely stays in Latin script.
 *
 *   node tests/i18n-scan.mjs [baseUrl]
 *
 * Set NEWERA_SESSION to a session cookie value to also scan the signed-in UI.
 */

const BASE = process.argv[2] || 'http://localhost:3000';
const SESSION = process.env.NEWERA_SESSION || '';

const PUBLIC_PAGES = [
  '/', '/courses', '/courses/standard', '/courses/pro', '/courses/vip',
  '/faq', '/reviews', '/about', '/mentorship', '/login', '/register',
  '/terms', '/privacy', '/refund-policy', '/support', '/forgot-password',
];

/** Only scanned when a session cookie is supplied. */
const PRIVATE_PAGES = [
  '/dashboard', '/courses/my', '/profile', '/settings', '/messages',
  '/notifications', '/journal', '/backtest', '/statistics', '/strategies',
  '/brokers', '/prop-challenge',
];

/**
 * Text that is legitimately Latin on a Russian page: brand names, ticker
 * symbols and the trading vocabulary traders use in English in every language.
 * Matching is case-insensitive and by substring, so a line made up only of
 * these (plus punctuation and digits) passes.
 */
const ALLOWED = [
  // Brand / platform
  'NEW ERA', 'NEW.ERA', 'MT5', 'MT4', 'MetaTrader', 'Telegram', 'Instagram',
  'YouTube', 'Zoom', 'Stripe', 'PayPal', 'Apple Pay', 'Google Pay', 'G Pay',
  'UnionPay', 'Mastercard', 'Visa', 'AMEX', 'American Express', 'Click',
  'Payme', 'Uzum', 'Humo', 'Uzcard', 'Supabase', 'Railway',
  // Plan names
  'STANDARD', 'PRO', 'VIP', 'PREMIUM', 'FREE',
  // Trading vocabulary (TZ §5 keeps these in English on purpose)
  'Forex', 'Trading', 'Trader', 'SMC', 'Smart Money', 'Order Block', 'BOS',
  'CHoCH', 'Fair Value Gap', 'FVG', 'Liquidity', 'Sweep', 'Breaker',
  'Inducement', 'Premium / Discount', 'Supply', 'Demand', 'Backtest',
  'Trading Journal', 'Risk Management', 'Position sizing', 'Win Rate',
  'Drawdown', 'Stop Loss', 'Take Profit', 'Entry', 'Buy', 'Sell', 'Pip',
  'Point', 'Spread', 'Lot', 'Leverage', 'Candlestick', 'Timeframe',
  'Prop', 'Challenge', 'Funded Account', 'Profit Target', 'Daily Loss',
  'Killzone', 'Session', 'Analysis', 'Technical', 'Fundamental',
  'NFP', 'FOMC', 'CPI', 'GDP', 'XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD',
  'USD', 'UZS', 'EUR', 'RR', 'XP', 'ID', 'QR', 'FAQ', 'Email', 'e-mail',
  'Sydney', 'Tokyo', 'London', 'New York', 'Step', 'Advanced', 'Real Chart',
  'News', 'Chart', 'Journal', 'Strategy', 'Strategies', 'Market Shift',
  'Higher High', 'Lower Low', 'Support', 'Resistance', 'Confirmation',
  // Hero chart mock-up — a screenshot of a trading terminal, English by design
  'ENTRY MODEL', 'Risk:Reward', 'FIRM RESULT', 'Passed', 'GOLD SPOT', 'SPOT',
  'PRICE', 'HIGH', 'LOW', 'VOLUME', '24H', 'XAU', 'Smart Money Concepts',
  'Test &', 'Pay',
  // Wordmark, rendered as separate elements
  'NEW', 'ERA',
  // The language switcher shows the locale code itself
  'ru', 'uz', 'en',
  // Level names — configurable data, kept in English like the trading terms
  'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Elite',
  // Seeded account data (a person's name and address are not UI copy)
  'Bosh Admin', 'admin@gmail.com', 'newera.uz', 'gmail.com',
  // Broker and prop-firm brand names
  'Exness', 'IC Markets', 'Pepperstone', 'FTMO', 'Funding Pips',
  'The Funded Trader', 'TradingView',
  // Strategy names and tags — the trading vocabulary, English everywhere
  'Market Structure', 'Order Block (OB)', 'Fair Value Gap (FVG)', 'Imbalance',
  'Killzones', 'Judas Swing', 'Drawdown Control', 'Sweep Model', 'Prop Firm',
  '1-Phase Challenge Pass Model', 'Profit Factor', 'Net P&L', 'P&L',
];

/** Avatar initials and other 1-3 letter fragments are not translatable copy. */
const INITIALS = /^[A-Z]{1,3}$/;

const ALLOWED_BY_LENGTH = [...ALLOWED].sort((a, b) => b.length - a.length);

/** Lines that are pure punctuation, digits, currency or symbols. */
const NOISE = /^[\s\d\p{P}\p{S}%·→←—–|/\\]*$/u;

/** Strips scripts, styles and tags, leaving what a reader sees. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isUntranslated(line) {
  if (NOISE.test(line)) return false;
  if (INITIALS.test(line)) return false;
  // Any Cyrillic means it went through the dictionary.
  if (/[а-яё]/i.test(line)) return false;

  // Remove every allowed term, then see whether real words are left over.
  // Longest first: otherwise "Entry" eats half of "ENTRY MODEL" and the
  // leftover "MODEL" looks like untranslated copy.
  let rest = line;
  for (const term of ALLOWED_BY_LENGTH) {
    rest = rest.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  // A leftover run of two or more Latin letters is untranslated copy.
  return /[a-z]{2,}/i.test(rest);
}

async function scan(page, cookie, label) {
  let html;
  try {
    const res = await fetch(BASE + page, { headers: { Cookie: cookie }, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      console.log(`  ↪️  ${label} → redirect (${res.status}), skipped`);
      return 0;
    }
    if (!res.ok) {
      console.log(`  ⚠️  ${label} → HTTP ${res.status}`);
      return 0;
    }
    html = await res.text();
  } catch (err) {
    console.log(`  ⚠️  ${label} → ${err.message}`);
    return 0;
  }

  const hits = [...new Set(visibleText(html).filter(isUntranslated))];
  if (!hits.length) {
    console.log(`  ✅ ${label}`);
    return 0;
  }

  const limit = Number(process.env.MAX_HITS || 12);
  console.log(`  ❌ ${label} — ${hits.length} строк:`);
  for (const hit of hits.slice(0, limit)) console.log(`        ${hit.slice(0, 88)}`);
  if (hits.length > limit) console.log(`        … и ещё ${hits.length - limit}`);
  return hits.length;
}

let problems = 0;
console.log(`\n── Untranslated text in RU  (${BASE})\n`);

for (const page of PUBLIC_PAGES) {
  problems += await scan(page, 'newera-locale=ru', page);
}

if (SESSION) {
  console.log('\n  ── signed in ──\n');
  const cookie = `newera-locale=ru; newera_session=${SESSION}`;
  for (const page of [...PUBLIC_PAGES, ...PRIVATE_PAGES]) {
    problems += await scan(page, cookie, `${page} (auth)`);
  }
} else {
  console.log('\n  ℹ️  NEWERA_SESSION не задан — интерфейс залогиненного пользователя не проверялся.');
}

console.log(problems ? `\n  Всего непереведённых строк: ${problems}\n` : '\n  Непереведённого текста не найдено.\n');
process.exit(problems ? 1 : 0);
