import type { CourseContent } from '@/lib/content/curriculum';
import type { Locale } from '@/lib/i18n/messages';

/**
 * Russian and English wording for the syllabus.
 * Uzbek in lib/content/curriculum.ts is the source of truth.
 */

interface ModuleCopy {
  title: string;
  topics: string[];
}

interface CourseCopy {
  tagline: string;
  badge?: string;
  outro?: string;
  modules?: ModuleCopy[];
  perks?: string[];
}

type Slug = CourseContent['slug'];

const RU: Record<Slug, CourseCopy> = {
  standard: {
    tagline: 'Профессиональный трейдинг с нуля',
    outro: '🔥 STANDARD: Что такое трейдинг? → MT5 → Основы Forex → Брокеры → Проп-фирмы → Новости → Классика → ICT',
    modules: [
      {
        title: 'Что такое трейдинг?',
        topics: [
          'Архитектура финансовых рынков и философия трейдинга',
          'Участники рынка: Центробанки, Маркетмейкеры, Фонды и Retail-трейдеры',
          'Торговые сессии (Азия, Лондон, Нью-Йорк) и периоды ликвидности',
          'Стили торговли: Скальпинг, Дейтрейдинг, Свинг-трейдинг, Позиционная торговля',
          'Механика рынка: Понятия Bid, Ask, Spread, Slippage и Swap',
        ],
      },
      {
        title: 'MT5',
        topics: [
          'Профессиональная настройка и навигация в терминале MT5',
          'Все типы ордеров: Рыночные, Лимитные (Buy/Sell) и Стоп (Buy/Sell)',
          'Работа со сложными ордерами Stop-Limit',
          'Математика правильной установки Stop Loss и Take Profit',
          'Калькулятор расчёта лота и процент риска от депозита (правило 1-2%)',
          'Шаблоны графиков, синтез таймфреймов и интеграция индикаторов',
        ],
      },
      {
        title: 'Основы Forex',
        topics: [
          'Классификация валютных пар: Major, Minor и Exotic пары',
          'Формулы расчёта пунктов: Pip, Point и Tick',
          'Механизм кредитного плеча (Leverage) и маржи (Margin)',
          'Предотвращение Margin Call и Stop Out',
          'Взаимная корреляция валют (EUR/USD, GBP/USD, индекс DXY)',
        ],
      },
      {
        title: 'Брокеры',
        topics: [
          'Типы брокеров: A-Book (ECN/STP) против B-Book (Market Maker / Dealing Desk)',
          'Проверка международных лицензий и регуляторов (FCA, CySEC, ASIC, NFA)',
          'Сравнение спредов, комиссий и скрытых платежей',
          'Пополнение счёта и безопасный вывод средств (UZS, Карты, Криптовалюта)',
          'Верификация аккаунта (KYC) и безопасность счета (2FA)',
        ],
      },
      {
        title: 'Проп-фирмы',
        topics: [
          'Экосистема проп-трейдинга (Proprietary Trading) и финансируемые счета',
          'Анализ ведущих проп-фирм (FTMO, FundedNext, The5ers и др.)',
          'Этапы челленджей: цели Phase 1 (8-10%) и Phase 2 (5%)',
          'Правила Max Daily Drawdown (5%) и Max Overall Drawdown (10-12%)',
          'Ограничения торговли на новостях и удержания через выходные',
          'Переход на Funded (реальный) счёт и получение выплат (Payout 80-90%)',
        ],
      },
      {
        title: 'Фундаментальные новости',
        topics: [
          'Профессиональная работа с экономическим календарём',
          'Процентные ставки центробанков (ФРС, ЕЦБ, Банк Англии) и их влияние',
          'Ключевые экономические показатели: NFP, CPI, PPI, ВВП (GDP)',
          'Управление расширением спреда и проскальзыванием во время новостей',
          'Правила безопасности торговли до, во время и после выхода новостей',
        ],
      },
      {
        title: 'Классика',
        topics: [
          'Понятие тренда: Восходящий, нисходящий и боковой (консолидация) рынок',
          'Теория Доу: Higher Highs (HH), Higher Lows (HL), Lower Highs (LH), Lower Lows (LL)',
          'Динамические и статические трендовые линии и параллельные каналы',
          'Классические разворотные модели: Голова и плечи (H&S), двойная вершина и дно',
          'Модели продолжения тренда: Флаг, вымпел, треугольники',
          'Свечной анализ: Пин-бар, поглощение (Engulfing), Доджи, Марубозу',
        ],
      },
      {
        title: 'ICT',
        topics: [
          'Философия и алгоритмы концепции ICT (Inner Circle Trader)',
          'Понятие ликвидности: Buy-side Liquidity (BSL) и Sell-side Liquidity (SSL)',
          'Зоны дисбаланса цен: FVG (Fair Value Gap) и Imbalance',
          'Определение институционального Order Block (OB) и оценка его силы',
          'Смена структуры рынка: Market Structure Shift (MSS) и BOS',
          'Optimal Trade Entry (OTE) и временные окна Killzone (Лондон и Нью-Йорк)',
        ],
      },
    ],
  },
  pro: {
    tagline: 'Профессиональный анализ, продвинутые стратегии и блок психологии',
    badge: '🔥 САМЫЙ ПОПУЛЯРНЫЙ',
    modules: [
      {
        title: 'Классические модели',
        topics: [
          'Институциональная интерпретация разворотных и трендовых паттернов',
          'Работа с моделями Quasimodo (QM) и Over & Under',
          'Анализ зон Flag Limit и FTR (Fail to Return)',
          'Синтез мульти-таймфреймов (от направления на HTF к точке входа на LTF)',
          'Фильтрация ложных сигналов и выбор сетапов с высокой вероятностью',
        ],
      },
      {
        title: 'SNR (Support & Resistance)',
        topics: [
          'Статические и динамические уровни поддержки и сопротивления',
          'Различие свежих (Fresh) и протестированных уровней',
          'Пробой (Breakout) сильных уровней и ретест (Retest)',
          'Role Reversal: смена роли поддержки и сопротивления',
          'Выявление ловушек ложного пробоя (Fakeout) и заработок на них',
        ],
      },
      {
        title: 'SMS (Smart Money Structure)',
        topics: [
          'Институциональная структура рынка: определение Swing High / Swing Low',
          'Change of Character (CHoCH) против Break of Structure (BOS)',
          'Сильные и слабые экстремумы (Strong High/Low против Weak High/Low)',
          'Зоны Premium и Discount (правило 50% Equilibrium)',
          'Ловушки индукции (Inducement) и защита от преждевременного входа',
        ],
      },
      {
        title: 'Trading Line',
        topics: [
          'Динамические трендовые линии и углы их пробоя',
          'Правило 3 касаний и признаки ослабления линии тренда',
          'Трендовая ликвидность: скопление стоп-лоссов вдоль тренда',
          'Входы с высоким R:R через пробой трендовой линии + ретест',
          'Параллельный канал и ранние индикаторы смены тренда',
        ],
      },
      {
        title: 'Fibonacci',
        topics: [
          'Математические основы коррекций и расширений Фибоначчи',
          'Зоны OTE (Optimal Trade Entry): уровни 0.618, 0.705, 0.786',
          'Целевые уровни расширения (0.272, -0.618) и фиксация прибыли',
          'Слияние уровней Фибоначчи с FVG и Order Block (Confluence)',
          'Прогнозирование глубоких коррекций по ходу тренда',
        ],
      },
      {
        title: 'ICT',
        topics: [
          'Judas Swing: манипуляции на Лондонской и Нью-Йоркской сессиях',
          'Стратегия Silver Bullet: высоковероятные входы в точное временное окно',
          'Техника работы с Breaker Block и Mitigation Block',
          'Закономерность заполнения Liquidity Void и Volume Imbalance',
          'Daily Bias: алгоритм утреннего определения дневного направления',
        ],
      },
      {
        title: 'Индивидуальная стратегия',
        topics: [
          'Разработка личного торгового плана (Trading Playbook) с нуля',
          'Чёткие правила входа (Entry), выхода (Exit) и отмены сетапа (Invalidation)',
          'Выбор профильной торговой сессии (только Лондон или только Нью-Йорк)',
          'Мастерство на одном инструменте (Mastering One Pair: XAU/USD или EUR/USD)',
          'Чек-лист из 5 строгих подтверждений перед открытием каждой сделки',
        ],
      },
      {
        title: 'Стратегия AMD',
        topics: [
          'Цикл Accumulation (накопление), Manipulation (манипуляция), Distribution (распределение)',
          'Концепция Power of 3 (PO3): цикл Open, High/Low, Close',
          'Азиатский диапазон (Asian Range) и Лондонская манипуляция',
          'Нью-Йоркская экспансия и формирование дневной свечи',
          'Вход в самой высокой или самой низкой точке дня по модели AMD',
        ],
      },
      {
        title: 'О брокерах',
        topics: [
          'Секреты скальпинга на счетах Raw Spread ECN',
          'Торговля без задержек через FIX API и VPS (ultra-low latency)',
          'Анализ поставщиков ликвидности (LP) и маршрутизации клиентских ордеров',
          'Методы минимизации расширения спреда и проскальзываний',
        ],
      },
      {
        title: 'О проп-фирмах',
        topics: [
          'Пошаговый план прохождения счетов на $100 000 и $200 000',
          'Формулы расчёта Trailing Drawdown против Balance-based Drawdown',
          'Правила консистентности (Consistency) и минимизация рисков',
          'Scaling Plan: процедура масштабирования капитала до $2 000 000',
        ],
      },
      {
        title: 'Ведение торгового журнала',
        topics: [
          'Архитектура профессионального торгового журнала (Notion и терминал)',
          '3 обязательных скриншота на каждую сделку (До входа, В позиции, Итог)',
          'Статистика сделок: Win rate, Risk/Reward, Profit Factor, Expectancy',
          'Классификация и устранение ошибок (FOMO, Revenge trading, ранний выход)',
        ],
      },
      {
        title: 'Риск-менеджмент',
        topics: [
          'Правило 1%: не рисковать более чем 1% от депозита в одной сделке',
          'Математическое преимущество соотношения Risk to Reward (R:R 1:3+)',
          'Дневной лимит убытка (Max Daily Loss) и дисциплина закрытия терминала',
          'Правила перевода в безубыток (Break-even) и частичной фиксации прибыли',
        ],
      },
      {
        title: 'Психология',
        topics: [
          '4 врага трейдера: Страх, Жадность, Надежда и Сожаление',
          'Техника полного устранения синдрома упущенной выгоды (FOMO)',
          'Ловушка торговли из мести (Revenge Trading) и тильта (Overtrading)',
          'Мышление вероятностями: одна отдельная сделка ничего не решает',
        ],
      },
      {
        title: 'Советы по коррекции психологии',
        topics: [
          'Восстановление психологического баланса в периоды просадок (Drawdown)',
          'Управление когнитивной усталостью, паузы и уход от мониторов',
          'Привычки и ежедневная подготовка, формирующие торговую дисциплину',
          'Здоровый распорядок дня и образ жизни профессионального трейдера',
        ],
      },
    ],
  },
};

const EN: Record<Slug, CourseCopy> = {
  standard: {
    tagline: 'Learn professional trading from zero',
    outro: '🔥 STANDARD: What is trading? → MT5 → Forex basics → Brokers → Prop firms → News → Classic → ICT',
    modules: [
      {
        title: 'What is trading?',
        topics: [
          'Financial markets architecture and trading philosophy',
          'Market participants: Central Banks, Market Makers, Funds, and Retail Traders',
          'Trading sessions (Asian, London, New York) and liquidity windows',
          'Trading styles: Scalping, Day trading, Swing trading, Position trading',
          'Market mechanics: Bid, Ask, Spread, Slippage, and Swap concepts',
        ],
      },
      {
        title: 'MT5',
        topics: [
          'Professional MT5 terminal setup and platform navigation',
          'All order types: Market, Limit (Buy/Sell), and Stop (Buy/Sell)',
          'Working with advanced Stop-Limit orders',
          'Mathematics of placing accurate Stop Loss and Take Profit levels',
          'Position sizing calculator and account risk percentage (1-2% rule)',
          'Chart templates, multi-timeframe synthesis, and indicator integration',
        ],
      },
      {
        title: 'Forex basics',
        topics: [
          'Currency pair classification: Major, Minor, and Exotic pairs',
          'Formulas for calculating Pips, Points, and Ticks',
          'Leverage mechanics and Margin requirements',
          'Preventing Margin Call and Stop Out situations',
          'Currency correlation (EUR/USD, GBP/USD, DXY index)',
        ],
      },
      {
        title: 'Brokers',
        topics: [
          'Broker models: A-Book (ECN/STP) vs B-Book (Market Maker / Dealing Desk)',
          'International regulatory licenses inspection (FCA, CySEC, ASIC, NFA)',
          'Comparing spreads, execution fees, and hidden commissions',
          'Safe funding and capital withdrawals (UZS, Bank cards, Crypto)',
          'Account verification (KYC) and account security (2FA)',
        ],
      },
      {
        title: 'Prop firms',
        topics: [
          'Proprietary trading ecosystem and funded account principles',
          'Analysis of leading prop firms (FTMO, FundedNext, The5ers, etc.)',
          'Challenge evaluation phases: Phase 1 (8-10%) and Phase 2 (5%) targets',
          'Max Daily Drawdown (5%) and Max Overall Drawdown (10-12%) rules',
          'News trading and weekend holding guidelines',
          'Transitioning to Funded accounts and receiving profit splits (80-90% Payout)',
        ],
      },
      {
        title: 'Fundamental news',
        topics: [
          'Professional workflow with the Economic Calendar',
          'Central bank interest rate decisions (Fed, ECB, BOE) and market impact',
          'Key macroeconomic data: NFP, CPI, PPI, GDP figures',
          'Managing spread widening and slippage during news releases',
          'Safety guidelines for trading before, during, and after news events',
        ],
      },
      {
        title: 'Classic models',
        topics: [
          'Understanding trend dynamics: Uptrend, Downtrend, and Ranging consolidation',
          'Dow Theory: Higher Highs (HH), Higher Lows (HL), Lower Highs (LH), Lower Lows (LL)',
          'Dynamic and static trendlines and parallel channels',
          'Classic reversal patterns: Head & Shoulders (H&S), Double Top and Bottom',
          'Trend continuation patterns: Flags, Pennants, and Triangles',
          'Candlestick analysis: Pin bar, Engulfing, Doji, Marubozu',
        ],
      },
      {
        title: 'ICT',
        topics: [
          'Philosophy and algorithmic models of ICT (Inner Circle Trader)',
          'Understanding liquidity: Buy-side Liquidity (BSL) and Sell-side Liquidity (SSL)',
          'Imbalance zones and Fair Value Gaps (FVG)',
          'Identifying Institutional Order Blocks (OB) and evaluating their strength',
          'Market Structure Shift (MSS) and Break of Structure (BOS)',
          'Optimal Trade Entry (OTE) and Killzone timings (London & New York)',
        ],
      },
    ],
  },
  pro: {
    tagline: 'Professional market analysis, advanced strategies and psychology',
    badge: '🔥 MOST POPULAR',
    modules: [
      {
        title: 'Classic models',
        topics: [
          'Institutional interpretation of reversal and continuation patterns',
          'Quasimodo (QM) and Over & Under market models',
          'Analyzing Flag Limit and Fail to Return (FTR) zones',
          'Multi-timeframe analysis (from HTF bias down to LTF entries)',
          'Filtering false breakouts and selecting high-probability setups',
        ],
      },
      {
        title: 'SNR (Support & Resistance)',
        topics: [
          'Static and dynamic support and resistance levels',
          'Distinguishing Fresh vs Tested historical price zones',
          'Breakout confirmation and Retest execution',
          'Role Reversal: Support turning into resistance and vice versa',
          'Detecting Fakeout traps and turning them into profitable trades',
        ],
      },
      {
        title: 'SMS (Smart Money Structure)',
        topics: [
          'Institutional structure: Identifying true Swing Highs and Swing Lows',
          'Change of Character (CHoCH) vs Break of Structure (BOS)',
          'Strong vs Weak Highs and Lows framework',
          'Premium and Discount pricing zones (50% Equilibrium rule)',
          'Identifying Inducement traps and avoiding early entries',
        ],
      },
      {
        title: 'Trading Line',
        topics: [
          'Dynamic trendlines and their breakout angles',
          'The 3-touch rule and exhaustion signals on trendlines',
          'Trendline liquidity: Trapped retail stop orders along diagonal lines',
          'Trendline breakout + Retest execution for high Risk-Reward trades',
          'Parallel channel patterns and early trend reversal signs',
        ],
      },
      {
        title: 'Fibonacci',
        topics: [
          'Mathematical foundations of Fibonacci retracements and extensions',
          'Optimal Trade Entry (OTE) golden zones: 0.618, 0.705, 0.786',
          'Extension price targets (0.272, -0.618) and profit taking',
          'Confluence: Merging Fibonacci levels with FVG and Order Blocks',
          'Anticipating deep corrective pullbacks within strong trends',
        ],
      },
      {
        title: 'ICT',
        topics: [
          'Judas Swing: London and New York opening fakeout liquidity runs',
          'Silver Bullet strategy: High-probability time-specific execution model',
          'Techniques for trading Breaker Blocks and Mitigation Blocks',
          'Liquidity Void and Volume Imbalance rebalancing mechanics',
          'Daily Bias: Algorithmic morning process to determine daily direction',
        ],
      },
      {
        title: 'Individual strategy',
        topics: [
          'Developing your customized Trading Playbook from scratch',
          'Strict Entry, Exit, and Setup Invalidation criteria',
          'Session specialization (Focusing exclusively on London or New York)',
          'Mastering One Pair (Specializing in XAU/USD or EUR/USD)',
          'Pre-trade 5-point confirmation checklist before order execution',
        ],
      },
      {
        title: 'AMD strategy',
        topics: [
          'The Accumulation, Manipulation, and Distribution cycle',
          'Power of 3 (PO3) model: Open, High/Low, and Close daily rhythm',
          'Asian Range boundaries and London session manipulation',
          'New York expansion and daily candle formation',
          'Catching the exact high or low of the day using the AMD framework',
        ],
      },
      {
        title: 'About brokers',
        topics: [
          'Secrets of scalping on Raw Spread ECN accounts',
          'Ultra-low latency trading with FIX API and dedicated VPS setup',
          'Liquidity Provider (LP) tiering and client order routing analysis',
          'Practical ways to minimize spread spikes and execution slippage',
        ],
      },
      {
        title: 'About prop firms',
        topics: [
          'Step-by-step roadmap to pass $100,000 and $200,000 evaluation accounts',
          'Trailing Drawdown vs Balance-based Drawdown mathematical breakdown',
          'Managing Consistency rules while keeping risk strictly controlled',
          'Scaling Plan: Procedure to compound trading capital up to $2,000,000',
        ],
      },
      {
        title: 'Keeping a trading journal',
        topics: [
          'Professional trading journal structure (Notion & Platform integration)',
          'Three essential screenshots per trade (Pre-entry, In-trade, Post-exit)',
          'Performance metrics: Win rate, Risk/Reward, Profit Factor, Expectancy',
          'Classifying and fixing behavioral errors (FOMO, Revenge trading, early exits)',
        ],
      },
      {
        title: 'Risk management',
        topics: [
          'The 1% Rule: Never risking more than 1% of total equity on any single idea',
          'Mathematical edge of Risk to Reward (R:R 1:3+): Profitable at 40% win rate',
          'Max Daily Loss limits and enforcing the discipline to walk away',
          'Moving to Break-even and structured partial profit-taking (Scale-out)',
        ],
      },
      {
        title: 'Trading psychology',
        topics: [
          'The 4 mental hurdles of trading: Fear, Greed, Hope, and Regret',
          'Actionable techniques to eliminate the Fear of Missing Out (FOMO)',
          'Breaking the cycle of Revenge Trading and overtrading burnout',
          'Thinking in Probabilities: Realizing no single individual trade matters',
        ],
      },
      {
        title: 'Psychological mindset advice',
        topics: [
          'Maintaining emotional composure during inevitable equity drawdowns',
          'Managing cognitive fatigue: Screen-time limits and scheduled resets',
          'Daily routines, meditation, and pre-market preparation for discipline',
          'A professional trader daily routine: Sleep, fitness, and lifestyle design',
        ],
      },
    ],
  },
};

const COPY: Partial<Record<Locale, Record<Slug, CourseCopy>>> = { ru: RU, en: EN };

export function localizeCurriculum(content: CourseContent, locale: Locale): CourseContent {
  const copy = COPY[locale]?.[content.slug];
  if (!copy) return content;

  return {
    ...content,
    tagline: copy.tagline || content.tagline,
    badge: copy.badge || content.badge,
    outro: copy.outro || content.outro,
    perks: copy.perks?.length ? copy.perks : content.perks,
    modules: content.modules.map((module, index) => {
      const translated = copy.modules?.[index];
      if (!translated) return module;
      return {
        ...module,
        title: translated.title || module.title,
        topics: translated.topics?.length === module.topics.length ? translated.topics : module.topics,
      };
    }),
  };
}

export function localizeAll(courses: CourseContent[], locale: Locale): CourseContent[] {
  return courses.map((c) => localizeCurriculum(c, locale));
}

const TARIFF_NOTES: Record<Locale, Record<number, string>> = {
  ru: { 0: '🎓 С нуля', 1: '🔥 Профессиональный уровень' },
  en: { 0: '🎓 From zero', 1: '🔥 Professional level' },
  uz: {},
};

export function localizeTariffNote(locale: Locale, index: number, fallback: string): string {
  return TARIFF_NOTES[locale]?.[index] || fallback;
}

export function localizeTariffHeadings(locale: Locale, fallback: { title: string; bestOrder: string; bestOrderSub: string }) {
  if (locale === 'ru') {
    return {
      title: '💰 ТАРИФЫ',
      bestOrder: 'Лучшая последовательность: STANDARD → PRO',
      bestOrderSub: 'Основы → Профессиональные стратегии → Психология и риск-менеджмент',
    };
  }
  if (locale === 'en') {
    return {
      title: '💰 PRICING PLANS',
      bestOrder: 'Best progression: STANDARD → PRO',
      bestOrderSub: 'Fundamentals → Professional Strategies → Psychology & Risk Management',
    };
  }
  return fallback;
}

const RESULT_ACTIONS: Record<Locale, string[]> = {
  uz: ['❌ Darsni qayta ko‘rish', '🔄 Testni qayta topshirish', '✅ Keyingi darsni ochish'],
  ru: ['❌ Повторить урок', '🔄 Пересдать тест', '✅ Открыть следующий урок'],
  en: ['❌ Rewatch the lesson', '🔄 Retake the test', '✅ Unlock the next lesson'],
};

export function localizeResultActions(locale: Locale, fallback: string[]): string[] {
  return RESULT_ACTIONS[locale] || fallback;
}

const JOURNEY_STEPS: Record<Locale, string[]> = {
  uz: ['Video dars', 'Xulosa', 'Test', '90% natija', 'Keyingi dars', 'Strategiya', 'Backtest', 'Trading jurnali', 'Psixologiya'],
  ru: ['Видеоурок', 'Конспект', 'Тест', 'Результат 90%', 'Следующий урок', 'Стратегия', 'Бэктест', 'Торговый журнал', 'Психология'],
  en: ['Video lesson', 'Summary', 'Test', '90% score', 'Next lesson', 'Strategy', 'Backtest', 'Trading journal', 'Psychology'],
};

export function localizeJourney(locale: Locale, fallback: string[]): string[] {
  return JOURNEY_STEPS[locale] || fallback;
}

