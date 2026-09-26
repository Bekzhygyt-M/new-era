import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. Courses - Only Standard and Pro
db.courses = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'STANDARD TRADING',
    slug: 'standard',
    description: 'Tradingni 0 dan professional o‘rganish. Trading nima?, MT5, Forex asoslari, Brokerlar, Prop firmalar, Fundamental yangiliklar, Klassika va ICT.',
    short_description: 'Noldan boshlab professional treyding asoslari.',
    level: 'beginner',
    price: 299000,
    currency: 'UZS',
    published: true,
    featured: true,
    thumbnail_url: null,
    order_index: 1,
    certificate_prefix: 'STA'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'PRO TRADING',
    slug: 'pro',
    description: 'Professional tahlil, ilg‘or strategiyalar va psixologiya bo‘limi. Klassik modellar, SNR, SMS, Trading Line, Fibonacci, ICT, Individual va AMD strategiyalari hamda trading psixologiyasi.',
    short_description: 'Professional strategiyalar, Prop challenge va Psixologiya bo‘limi.',
    level: 'pro',
    price: 599000,
    currency: 'UZS',
    published: true,
    featured: true,
    thumbnail_url: null,
    order_index: 2,
    certificate_prefix: 'PRO'
  }
];

// 2. Modules - Standard & Pro
db.modules = [
  // Standard modules
  {
    id: '44444444-0000-0000-0000-000000000001',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '1️⃣ 🌍 Trading nima?',
    description: 'Trading tushunchasi • Bozor qatnashchilari • Moliyaviy bozorlar • Boshlang‘ich qoidalar',
    order_index: 1,
    icon: '🌍',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },
  {
    id: '44444444-0000-0000-0000-000000000002',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '2️⃣ 💻 MT5',
    description: 'MT5 platformasini sozlash • Grafiklar bilan ishlash • Orderlar turlari • Lot va risk hisobi',
    order_index: 2,
    icon: '💻',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },
  {
    id: '44444444-0000-0000-0000-000000000003',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '3️⃣ 📈 Forex asoslari',
    description: 'Valyuta juftliklari • Pip, point va spread • Forex sessiyalari • Bozor harakati',
    order_index: 3,
    icon: '📈',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },
  {
    id: '44444444-0000-0000-0000-000000000004',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '4️⃣ 🏦 Brokerlar',
    description: 'Broker qanday ishlaydi? • Ishonchli broker tanlash • Verifikatsiya • Depozit va yechish',
    order_index: 4,
    icon: '🏦',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },
  {
    id: '44444444-0000-0000-0000-000000000005',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '5️⃣ 🏢 Prop firmalar',
    description: 'Prop kompaniyalar • Funded account imkoniyati • Challenge qoidalari • Risk limitlari',
    order_index: 5,
    icon: '🏢',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },
  {
    id: '44444444-0000-0000-0000-000000000006',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '6️⃣ 📰 Fundamental yangiliklar',
    description: 'Iqtisodiy kalendar • NFP, CPI, FOMC • Yangiliklar tahlili • Bozorga ta’siri',
    order_index: 6,
    icon: '📰',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },
  {
    id: '44444444-0000-0000-0000-000000000007',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '7️⃣ 📊 Klassika',
    description: 'Trend chiziqlari • Support & Resistance • Klassik shamchalar • Grafik modellari',
    order_index: 7,
    icon: '📊',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },
  {
    id: '44444444-0000-0000-0000-000000000008',
    course_id: '11111111-1111-1111-1111-111111111111',
    title: '8️⃣ 🎯 ICT',
    description: 'ICT metodologiyasi • Likvidlik zonalari • Order Block asoslari • Bozor strukturasi',
    order_index: 8,
    icon: '🎯',
    is_published: true,
    requires_backtest: false,
    requires_journal: false
  },

  // Pro modules
  {
    id: '55555555-0000-0000-0000-000000000001',
    course_id: '22222222-2222-2222-2222-222222222222',
    title: '1️⃣ 🎯 Strategiyalar',
    description: 'Klassik modellar • SNR • SMS • Trading Line • Fibonacci • ICT • Individual strategiya • AMD strategiyasi • Brokerlar haqida • Prop firmalar haqida',
    order_index: 1,
    icon: '🎯',
    is_published: true,
    requires_backtest: true,
    requires_journal: false
  },
  {
    id: '55555555-0000-0000-0000-000000000002',
    course_id: '22222222-2222-2222-2222-222222222222',
    title: '2️⃣ 🧠 Psixologiya bo‘limi',
    description: 'Trading jurnal yuritish • Risk menejment • Psixologiya • Psixologiyani to‘g‘rilashga oid maslahatlar',
    order_index: 2,
    icon: '🧠',
    is_published: true,
    requires_backtest: false,
    requires_journal: true
  }
];

// 3. User Cards provided by user
const realCards = [
  {
    id: 'card_humo',
    type: 'Humo',
    number: '9860 1701 1477 2172',
    raw_number: '9860170114772172',
    holder: 'Abbos Erkinov',
    is_primary: true
  },
  {
    id: 'card_uzcard',
    type: 'Uzkart',
    number: '5614 6821 1727 0571',
    raw_number: '5614682117270571',
    holder: 'Abbos Erkinov',
    is_primary: false
  },
  {
    id: 'card_visa',
    type: 'Visa',
    number: '4023 0602 4867 3021',
    raw_number: '4023060248673021',
    holder: 'Abbos Erkinov',
    is_primary: false
  }
];

// 4. Update Settings
db.settings = {
  ...db.settings,
  card_number: '9860 1701 1477 2172',
  card_holder: 'Abbos Erkinov',
  cards: realCards,
  course_limit_days: 30,
  pricing: {
    standard: {
      daily: 19000,
      monthly: 299000,
      yearly: 2499000
    },
    pro: {
      daily: 39000,
      monthly: 599000,
      yearly: 4999000
    }
  },
  payment_instructions: "To'lovni quyidagi karta raqamlaridan biriga o'tkazing va chek skrinshotini yuklang. Admin 15 daqiqa ichida tekshiradi."
};

// 5. Realistic Reviews without any false profit guarantees
db.reviews = [
  {
    id: 'rev_1',
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '22222222-2222-2222-2222-222222222222',
    author_name: 'Jasur Rakhimov',
    rating: 5,
    content: "SMC va Order Block tushunchalarini chuqur tushunib oldim. Ayniqsa psixologiya va trading jurnal bo'limi savdolarimdagi tartibsizlikni yo'qotishga katta yordam berdi.",
    approved: true,
    created_at: '2026-08-15T10:30:00.000Z'
  },
  {
    id: 'rev_2',
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '11111111-1111-1111-1111-111111111111',
    author_name: 'Sardor Makhmudov',
    rating: 5,
    content: "Noldan boshlagan edim, MT5 va fundamental yangiliklar tahlili darslari juda sodda va tushunarli tushuntirilgan. Hech qanday ortiqcha gap yo'q, tizimli bilim beriladi.",
    approved: true,
    created_at: '2026-08-22T14:15:00.000Z'
  },
  {
    id: 'rev_3',
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '22222222-2222-2222-2222-222222222222',
    author_name: 'Azizbek Karimov',
    rating: 5,
    content: "Prop firmalar challenge qoidalari va risk menejment bo'yicha eng foydali ma'lumotlar shu yerda ekan. 1:3 risk/reward qoidasini amalda qo'llashni o'rgandim.",
    approved: true,
    created_at: '2026-09-01T09:00:00.000Z'
  },
  {
    id: 'rev_4',
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '22222222-2222-2222-2222-222222222222',
    author_name: 'Madina Temirova',
    rating: 5,
    content: "Fibonacci va AMD strategiyasi bo'yicha tushuntirishlar juda qiziq va amaliy. Oldin hissiyot bilan savdo qilardim, endi reja bilan ishlayapman.",
    approved: true,
    created_at: '2026-09-08T16:45:00.000Z'
  },
  {
    id: 'rev_5',
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '11111111-1111-1111-1111-111111111111',
    author_name: 'Bobur Ortikov',
    rating: 5,
    content: "Boshlovchilar uchun Standart kursi ayni muddao. Broker tanlash va verifikatsiyadan boshlab ICT asoslarigacha aniq ketma-ketlikda o'rgatilgan.",
    approved: true,
    created_at: '2026-09-12T11:20:00.000Z'
  },
  {
    id: 'rev_6',
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '22222222-2222-2222-2222-222222222222',
    author_name: 'Dilshodbek Sattorov',
    rating: 5,
    content: "Klassik modellar va SNR strategiyasi aniq vizual misollar bilan ko'rsatilgan. 30 kunlik intizomli o'qish jarayoni o'z natijasini berdi.",
    approved: true,
    created_at: '2026-09-15T18:10:00.000Z'
  }
];

db.profiles = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@gmail.com',
    full_name: 'Bosh Admin',
    role: 'admin',
    level: 'Pro',
    xp: 5000,
    password_hash: 'scrypt$16384$8$1$0ea14f1eada500d68c957fa22d4dfe36$259d4ead1dc93c831a464e67c54954517e2b7eded645e6d04465fdc0d600070d23216fdfb2a91d59d35f920257962686790d6d26520b57311110c8cfa83af6c9',
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Seed data successfully updated!');
