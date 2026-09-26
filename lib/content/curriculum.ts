/**
 * NEW ERA course catalogue content.
 *
 * Faqat Pro va Standart tariflari.
 * Standart — 299 000 so‘m (Trading nima?, MT5, Forex asoslari, Brokerlar, Prop firmalar, Fundamental yangiliklar, Klassika, ICT).
 * Pro — Strategiyalar (Klassik modellar, SNR, SMS, Trading Line, Fibonacci, ICT, Individual strategiya, AMD strategiyasi, Brokerlar haqida, Prop firmalar haqida)
 *       Psixologiya bo‘limi (Trading jurnal yuritish, Risk menejment, Psixologiya, Psixologiyani to‘g‘rilashga oid maslahatlar).
 */

export interface CurriculumModule {
  /** Numbered badge, e.g. "1️⃣". */
  number: string;
  emoji: string;
  title: string;
  topics: string[];
}

export interface TariffPricing {
  daily: number;
  monthly: number;
  yearly: number;
}

export interface CourseContent {
  slug: 'standard' | 'pro';
  courseId: string;
  medal: string;
  name: string;
  price: number;
  priceLabel: string;
  badge?: string;
  tagline: string;
  taglineEmoji: string;
  perks?: string[];
  modules: CurriculumModule[];
  outro?: string;
  accent: 'neutral' | 'pink' | 'purple' | 'gold';
  pricing: TariffPricing;
}

export const COURSE_IDS = {
  standard: '11111111-1111-1111-1111-111111111111',
  pro: '22222222-2222-2222-2222-222222222222',
} as const;

export const STANDARD_COURSE: CourseContent = {
  slug: 'standard',
  courseId: COURSE_IDS.standard,
  medal: '🥉',
  name: 'STANDARD',
  price: 299000,
  priceLabel: '299 000 so‘m',
  tagline: 'Tradingni 0 dan professional o‘rganish',
  taglineEmoji: '🎓',
  accent: 'neutral',
  pricing: {
    daily: 19000,
    monthly: 299000,
    yearly: 2499000,
  },
  modules: [
    {
      number: '1️⃣',
      emoji: '🌍',
      title: 'Trading nima?',
      topics: [
        'Moliyaviy bozorlar arxitekturasi va treyding falsafasi',
        'Bozor qatnashchilari: Markaziy banklar, Marketmeykerlar, Fondlar va Retail treyderlar',
        'Savdo sessiyalari (Osiyo, London, Nyu-York) va likvidlik davrlari',
        'Treyding uslublari: Scalping, Day trading, Swing trading, Position trading',
        'Bozor mexanikasi: Bid, Ask, Spread, Slippage va Swap tushunchalari',
      ],
    },
    {
      number: '2️⃣',
      emoji: '💻',
      title: 'MT5',
      topics: [
        'MT5 platformasini professional darajada sozlash va navigatsiya',
        'Barcha turdagi orderlar: Market, Limit (Buy/Sell) va Stop (Buy/Sell)',
        'Murakkab Stop-Limit buyruqlari bilan ishlash',
        'Stop Loss va Take Profit to‘g‘ri o‘rnatish matematikasi',
        'Lot hajmini hisoblash kalkulyatori va depozitga nisbatan risk foizi (1-2%)',
        'Grafik shablonlari, timeframe sintezi va indikatorlar integratsiyasi',
      ],
    },
    {
      number: '3️⃣',
      emoji: '📈',
      title: 'Forex asoslari',
      topics: [
        'Valyuta juftliklari tasnifi: Major, Minor va Exotic juftliklar',
        'Pip, Point va Tick hisoblash formulalari',
        'Leverage (kredit yelkasi) va Margin (garov) mexanizmi',
        'Margin Call va Stop Out xavflarining oldini olish',
        'Valyutalarning o‘zaro korrelyatsiyasi (EUR/USD, GBP/USD, DXY indeksi)',
      ],
    },
    {
      number: '4️⃣',
      emoji: '🏦',
      title: 'Brokerlar',
      topics: [
        'Broker turlari: A-Book (ECN/STP) vs B-Book (Market Maker / Dealing Desk)',
        'Xalqaro litsenziyalar va regulyatorlar tekshiruvi (FCA, CySEC, ASIC, NFA)',
        'Spredlar, komissiyalar va yashirin to‘lovlarni solishtirish',
        'Depozit kiritish va mablag‘larni xavfsiz yechib olish (UZS, Karta, Kripto)',
        'Hisobni verifikatsiya qilish (KYC) va hisob xavfsizligi (2FA)',
      ],
    },
    {
      number: '5️⃣',
      emoji: '🏢',
      title: 'Prop firmalar',
      topics: [
        'Proprietary Trading ekotizimi va moliyalashtirilgan hisoblar mohiyati',
        'Yetakchi prop firmalar tahlili (FTMO, FundedNext, The5ers va b.)',
        'Challenge bosqichlari: Phase 1 (8-10%) va Phase 2 (5%) targetlari',
        'Max Daily Drawdown (5%) va Max Overall Drawdown (10-12%) qoidalari',
        'Yangiliklar va dam olish kunlarida savdo qilish cheklovlari',
        'Funded (real) hisobga o‘tish va to‘lovlarni (Payout 80-90%) qabul qilish',
      ],
    },
    {
      number: '6️⃣',
      emoji: '📰',
      title: 'Fundamental yangiliklar',
      topics: [
        'Iqtisodiy taqvim (Economic Calendar) bilan professional ishlash',
        'Markaziy banklar foiz stavkalari (Fed, ECB, BOE) va ularning bozorga ta’siri',
        'Asosiy iqtisodiy ko‘rsatkichlar: NFP (Non-Farm Payrolls), CPI, PPI, YaIM (GDP)',
        'Yangiliklar paytidagi spred kengayishi va slippageni boshqarish',
        'Yangilikdan oldin, vaqtida va keyin savdo qilish xavfsizlik qoidalari',
      ],
    },
    {
      number: '7️⃣',
      emoji: '📊',
      title: 'Klassika',
      topics: [
        'Trend tushunchasi: Uptrend, Downtrend va Ranging (konsolidatsiya) bozor',
        'Dow nazariyasi: Higher Highs (HH), Higher Lows (HL), Lower Highs (LH), Lower Lows (LL)',
        'Dinamik va statik trend chiziqlari hamda parallel kanallar',
        'Klassik qaytish modellari: Bosh va yelkalar (H&S), Qo‘shaloq cho‘qqi va tub',
        'Trend davomiyligi modellari: Bayroq (Flag), Vimpel (Pennant), Uchburchaklar',
        'Yapon shamlari tahlili: Pin bar, Yutib yuborish (Engulfing), Doji, Marubozu',
      ],
    },
    {
      number: '8️⃣',
      emoji: '🎯',
      title: 'ICT',
      topics: [
        'ICT (Inner Circle Trader) konsepsiyasining falsafasi va algoritmlari',
        'Likvidlik tushunchasi: Buy-side Liquidity (BSL) va Sell-side Liquidity (SSL)',
        'FVG (Fair Value Gap) va narx nomutanosibligi (Imbalance) zonalari',
        'Institutsional Order Block (OB) aniqlash va kuchini baholash',
        'Bozor strukturasi o‘zgarishi: Market Structure Shift (MSS) va BOS',
        'Optimal Trade Entry (OTE) va Killzone vaqtlari (London va Nyu-York)',
      ],
    },
  ],
  outro: '🔥 STANDARD: Trading nima? → MT5 → Forex asoslari → Brokerlar → Prop firmalar → Fundamental yangiliklar → Klassika → ICT',
};

export const PRO_COURSE: CourseContent = {
  slug: 'pro',
  courseId: COURSE_IDS.pro,
  medal: '🥈',
  name: 'PRO',
  price: 499000,
  priceLabel: '499 000 so‘m',
  badge: '🔥 ENG MASHHUR',
  tagline: 'Professional tahlil, ilg‘or strategiyalar va psixologiya bo‘limi',
  taglineEmoji: '🚀',
  accent: 'pink',
  pricing: {
    daily: 39000,
    monthly: 499000,
    yearly: 4999000,
  },
  modules: [
    {
      number: '1️⃣',
      emoji: '📐',
      title: 'Klassik modellar',
      topics: [
        'Reversal va continuation patternlarining institutsional talqini',
        'Quasimodo (QM) va Over & Under modellari bilan ishlash',
        'Flag Limit va FTR (Fail to Return) zonalari tahlili',
        'Multi-timeframe sintez (HTF yo‘nalishidan LTF nuqtasiga kirish)',
        'Soxta signallarni filtrlash va yuqori ehtimolli setup tanlash',
      ],
    },
    {
      number: '2️⃣',
      emoji: '🧱',
      title: 'SNR (Support & Resistance)',
      topics: [
        'Statik va dinamik qo‘llab-quvvatlash va qarshilik darajalari',
        'Fresh (ishlatilmagan) va Test qilingan zonalarni farqlash',
        'Kuchli darajalarning sinishi (Breakout) va qayta tekshiruvi (Retest)',
        'Role Reversal: Support qarshilikka, qarshilik tayanchga aylanishi',
        'Fakeout (soxta sinish) tuzoqlarini fosh qilish va ulardan foydalanish',
      ],
    },
    {
      number: '3️⃣',
      emoji: '🌊',
      title: 'SMS (Smart Money Structure)',
      topics: [
        'Institutsional bozor strukturasi: Swing High / Swing Low aniqlash',
        'Change of Character (CHoCH) vs Break of Structure (BOS)',
        'Kuchli va kuchsiz cho‘qqilar (Strong High/Low vs Weak High/Low)',
        'Premium va Discount zonalari (50% Equilibrium qoidasi)',
        'Inducement (aldamchi likvidlik) tuzoqlari va ulardan himoyalanish',
      ],
    },
    {
      number: '4️⃣',
      emoji: '📏',
      title: 'Trading Line',
      topics: [
        'Dinamik trend chiziqlari va ularning sinish burchaklari',
        '3-nuqta qoidasi va trend chizig‘ining kuchsizlanish belgilari',
        'Trendline liquidity: trend bo‘ylab to‘plangan stop-losslar',
        'Trendline breakout + Retest orqali yuqori R:R bilan kirish',
        'Parallel kanal va trend o‘zgarishining erta indikatorlari',
      ],
    },
    {
      number: '5️⃣',
      emoji: '🔢',
      title: 'Fibonacci',
      topics: [
        'Fibonacci Retracement va Extension matematik asoslari',
        'OTE (Optimal Trade Entry) zonalari: 0.618, 0.705, 0.786 darajalar',
        'Target darajalari (0.272, -0.618 extension) va foydani belgilash',
        'Fibonacci darajalarini FVG va Order Block bilan uyg‘unlashtirish',
        'Trend bo‘ylab chuqur korreksiyalarni prognozlash',
      ],
    },
    {
      number: '6️⃣',
      emoji: '⚡',
      title: 'ICT',
      topics: [
        'Judas Swing: London va Nyu-York sessiyalaridagi manipulyatsiyalar',
        'Silver Bullet strategiyasi: Aniq vaqt oralig‘idagi yuqori ehtimolli kirish',
        'Breaker Block va Mitigation Block bilan ishlash texnikasi',
        'Liquidity Void va Volume Imbalance zonalarini to‘ldirish qonuniyati',
        'Daily Bias: Kunlik yo‘nalishni ertalabdan aniqlash algoritmi',
      ],
    },
    {
      number: '7️⃣',
      emoji: '🧭',
      title: 'Individual strategiya',
      topics: [
        'Shaxsiy savdo tizimi (Trading Playbook)ni noldan ishlab chiqish',
        'Aniq Kirish (Entry), Chiqish (Exit) va Invalidation qoidalari',
        'Savdo sessiyasini tanlash (faqat London yoki Nyu-York)',
        'Bitta juftlik ustasi bo‘lish (Mastering One Pair: XAU/USD yoki EUR/USD)',
        'Savdoga kirishdan oldingi 5 ta qat’iy tasdiq chek-listi',
      ],
    },
    {
      number: '8️⃣',
      emoji: '🔄',
      title: 'AMD strategiyasi',
      topics: [
        'Accumulation (To‘plash), Manipulation (Manipulyatsiya), Distribution (Tarqatish)',
        'Power of 3 (PO3) konsepsiyasi: Open, High/Low, Close sikli',
        'Osiyo sessiyasi diapazoni (Asian Range) va London manipulyatsiyasi',
        'Nyu-York ekspansiyasi va kunlik shamning shakllanishi',
        'AMD modeli orqali kunlik eng past yoki eng baland nuqtani ushlash',
      ],
    },
    {
      number: '9️⃣',
      emoji: '🏛️',
      title: 'Brokerlar haqida',
      topics: [
        'Raw Spread ECN hisoblarda scalping qilish sirlari',
        'FIX API va VPS orqali kechikishsiz (ultra-low latency) savdo',
        'Liquidity Provider (LP) va buyruqlarning bozorga uzatilishi tahlili',
        'Spred kengayishi va slippageni kamaytirish usullari',
      ],
    },
    {
      number: '🔟',
      emoji: '🏆',
      title: 'Prop firmalar haqida',
      topics: [
        '$100,000 va $200,000 hisoblarni bosqichma-bosqich topshirish rejalari',
        'Trailing Drawdown vs Balance-based Drawdown hisoblash formulalari',
        'Konsistensiya (Consistency) qoidalari va riskni minimal saqlash',
        'Scaling Plan: Hisobni $2,000,000 gacha kattalashtirish tartibi',
      ],
    },
    {
      number: '1️⃣1️⃣',
      emoji: '📓',
      title: 'Trading jurnal yuritish',
      topics: [
        'Professional savdo kundaligi tuzilmasi (Notion va Platform jurnali)',
        'Har bir bitimning 3 ta skrinshoti (Oldin, Jarayonda, Natija)',
        'Bitimlar statistikasi: Win rate, Risk/Reward, Profit Factor, Expectancy',
        'Xatolarni tasniflash (FOMO, Revenge trading, Erta chiqish) va tuzatish',
      ],
    },
    {
      number: '1️⃣2️⃣',
      emoji: '🛡️',
      title: 'Risk menejment',
      topics: [
        '1% qoidasi: Har bir bitimda depozitning 1% idan ortig‘ini tavakkal qilmaslik',
        'Risk to Reward (R:R 1:3+) matematik ustunligi: 40% win rate bilan daromad',
        'Kunlik maksimal zarar limiti (Max Daily Loss) va terminalni yopish intizomi',
        'Break-even ga ko‘chirish va Partial profit (qisman foyda olish) qoidalari',
      ],
    },
    {
      number: '1️⃣3️⃣',
      emoji: '🧠',
      title: 'Psixologiya',
      topics: [
        'Treyderning 4 dushmani: Qo‘rquv, Ochko‘zlik, Umid va Afsus',
        'FOMO (Imkoniyatni boy berish qo‘rquvi)ni yo‘qotish texnikasi',
        'Revenge Trading (O‘ch olish savdosi) va overtrading tuzog‘i',
        'Ehtimolliklar bilan fikrlash (Thinking in Probabilities): Bitta bitim hech narsani hal qilmaydi',
      ],
    },
    {
      number: '1️⃣4️⃣',
      emoji: '💡',
      title: 'Psixologiyani to‘g‘rilashga oid maslahatlar',
      topics: [
        'Ketma-ket yo‘qotishlar (Drawdown) davrida ruhiy barqarorlikni tiklash',
        'Ekrandan uzoqlashish, kognitiv charchoqni boshqarish va tanaffuslar',
        'Savdo intizomini shakllantiruvchi kunlik meditatsiya va tayyorgarlik odatlari',
        'Professional treyderning sog‘lom kundalik tartibi va intizomi',
      ],
    },
  ],
  outro: '🚀 PRO: Strategiyalar (Klassik modellar, SNR, SMS, Trading Line, Fibonacci, ICT, Individual, AMD, Brokerlar, Prop firmalar) + Psixologiya bo‘limi (Trading jurnal, Risk menejment, Psixologiya, Maslahatlar)',
};

export const ALL_COURSES: CourseContent[] = [STANDARD_COURSE, PRO_COURSE];

export function getCourseContent(slugOrId: string): CourseContent | null {
  return (
    ALL_COURSES.find((c) => c.slug === slugOrId || c.courseId === slugOrId) || null
  );
}

/** Tariff summary block. */
export const TARIFFS = {
  title: '💰 TARIFLAR',
  rows: [
    { medal: '🥉', name: 'STANDARD', price: '299 000 so‘m', note: '🎓 0 dan boshlash', slug: 'standard' },
    { medal: '🥈', name: 'PRO', price: '499 000 so‘m', note: '🔥 Professional daraja', slug: 'pro' },
  ],
  bestOrder: 'Eng yaxshi ketma-ketlik: STANDARD → PRO',
  bestOrderSub: 'Asoslar → Professional Strategiyalar → Psixologiya & Risk Menejment',
};

/** Learning tracks for dashboard. */
export const LEARNING_TRACKS = {
  beginner: [
    'Trading nima?',
    'MT5',
    'Forex asoslari',
    'Brokerlar',
    'Prop firmalar',
    'Fundamental yangiliklar',
    'Klassika',
    'ICT',
  ],
  pro: [
    'Klassik modellar',
    'SNR & SMS',
    'Trading Line',
    'Fibonacci & ICT',
    'Individual & AMD strategiyalari',
    'Trading jurnal yuritish',
    'Risk menejment',
    'Psixologiya',
  ],
};

export const RESULT_TABLE = [
  { range: '0-69%', action: '❌ Darsni qayta ko‘rish' },
  { range: '70-89%', action: '🔄 Testni qayta topshirish' },
  { range: '90-100%', action: '✅ Keyingi darsni ochish' },
];

export const STUDENT_JOURNEY = [
  'Video dars',
  'Xulosa',
  'Test',
  '90% natija',
  'Keyingi dars',
  'Strategiya',
  'Backtest',
  'Trading jurnali',
  'Psixologiya',
];

/** Compatibility alias to satisfy any stale dev server imports */
export const VIP_COURSE = PRO_COURSE;

