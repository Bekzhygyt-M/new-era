import { db } from '@/lib/db';
import { type LocalFaq } from '@/lib/local-db';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/messages';
import type { AdminSettings } from '@/lib/local-db';

/**
 * Platform FAQ.
 *
 * Admin-authored entries take priority. When none exist yet, the built-in set
 * below is used — its answers are generated from the live platform settings,
 * so a threshold shown here always matches the one the engine enforces.
 *
 * The defaults exist in all three interface languages: they are rendered on
 * public pages, so a visitor who picked Russian must not be shown Uzbek copy.
 */

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

type Copy = (s: AdminSettings) => { question: string; answer: string };

const levels = (s: AdminSettings) => s.level_thresholds.map((t: { name: string; xp: number }) => `${t.name} (${t.xp}+ XP)`).join(', ');

const DEFAULTS: Record<string, Record<Locale, Copy>> = {
  'default-flow': {
    uz: (s) => ({
      question: 'Kurs qanday ishlaydi?',
      answer: `Har bir dars video, qisqacha xulosa va muhim atamalardan iborat. Videoni kamida ${s.watch_requirement}% ko‘rganingizdan so‘ng test ochiladi. Testdan ${s.passing_score}% va undan yuqori natija olsangiz, keyingi dars avtomatik ochiladi. Darslarni istalgancha qayta ko‘rishingiz mumkin.`,
    }),
    ru: (s) => ({
      question: 'Как устроено обучение?',
      answer: `Каждый урок состоит из видео, краткого конспекта и ключевых терминов. Тест открывается после того, как вы посмотрите не менее ${s.watch_requirement}% видео. Набрав ${s.passing_score}% и выше, вы автоматически открываете следующий урок. Пересматривать уроки можно сколько угодно раз.`,
    }),
    en: (s) => ({
      question: 'How does the course work?',
      answer: `Every lesson has a video, a short summary and the key terms. The test unlocks once you have watched at least ${s.watch_requirement}% of the video. Score ${s.passing_score}% or higher and the next lesson opens automatically. You can rewatch any lesson as often as you like.`,
    }),
  },
  'default-passing': {
    uz: (s) => ({
      question: `${s.passing_score}% talabi qanday ishlaydi?`,
      answer: `Natija 0–69% bo‘lsa darsni qaytadan ko‘rish tavsiya etiladi, 70–${s.passing_score - 1}% bo‘lsa testni qayta topshirasiz, ${s.passing_score}% va undan yuqori bo‘lsa keyingi dars ochiladi. Natija server tomonida hisoblanadi — to‘g‘ri javoblar hech qachon brauzerga yuborilmaydi.`,
    }),
    ru: (s) => ({
      question: `Как работает требование ${s.passing_score}%?`,
      answer: `При результате 0–69% рекомендуется пересмотреть урок, при 70–${s.passing_score - 1}% нужно перепройти тест, а при ${s.passing_score}% и выше открывается следующий урок. Результат считается на сервере — правильные ответы никогда не отправляются в браузер.`,
    }),
    en: (s) => ({
      question: `How does the ${s.passing_score}% requirement work?`,
      answer: `At 0–69% you are advised to rewatch the lesson, at 70–${s.passing_score - 1}% you retake the test, and at ${s.passing_score}% or above the next lesson opens. Scoring happens on the server — the correct answers are never sent to the browser.`,
    }),
  },
  'default-retake': {
    uz: () => ({
      question: 'Testdan o‘ta olmasam qayta topshirsam bo‘ladimi?',
      answer:
        'Ha. Agar admin dars uchun urinishlar sonini cheklamagan bo‘lsa, testni cheksiz qayta topshirishingiz mumkin. Har bir urinish natijasi saqlanadi va profilingizda ko‘rinadi.',
    }),
    ru: () => ({
      question: 'Можно ли пересдать тест, если я его не прошёл?',
      answer:
        'Да. Если администратор не ограничил число попыток для урока, тест можно пересдавать неограниченно. Результат каждой попытки сохраняется и виден в вашем профиле.',
    }),
    en: () => ({
      question: 'Can I retake a test I failed?',
      answer:
        'Yes. Unless an admin has capped the number of attempts for that lesson, you can retake the test as many times as you need. Every attempt is stored and visible in your profile.',
    }),
  },
  'default-xp': {
    uz: (s) => ({
      question: 'XP va daraja tizimi qanday ishlaydi?',
      answer: `Darsni tugatganingiz uchun ${s.xp_lesson} XP, testdan o‘tganingiz uchun ${s.xp_test} XP, modulni yakunlaganingiz uchun ${s.xp_module} XP va kursni tugatganingiz uchun ${s.xp_course} XP beriladi. Darajalar: ${levels(s)}. Har bir mukofot faqat bir marta beriladi.`,
    }),
    ru: (s) => ({
      question: 'Как работает система XP и уровней?',
      answer: `За пройденный урок начисляется ${s.xp_lesson} XP, за сданный тест — ${s.xp_test} XP, за завершённый модуль — ${s.xp_module} XP, за пройденный курс — ${s.xp_course} XP. Уровни: ${levels(s)}. Каждая награда начисляется только один раз.`,
    }),
    en: (s) => ({
      question: 'How do XP and levels work?',
      answer: `You earn ${s.xp_lesson} XP for finishing a lesson, ${s.xp_test} XP for passing its test, ${s.xp_module} XP for completing a module and ${s.xp_course} XP for completing the course. Levels: ${levels(s)}. Each reward is granted only once.`,
    }),
  },
  'default-payment': {
    uz: (s) => ({
      question: 'To‘lov qanday amalga oshiriladi?',
      answer: `Kursni tanlaganingizdan so‘ng ${s.payment_window_minutes} daqiqalik buyurtma ochiladi. Ko‘rsatilgan karta raqamiga to‘lov qilib, chek skrinshotini yuklaysiz. Chek admin tekshiruviga tushadi va tasdiqlangach kurs darhol ochiladi. Rad etilsa, sababi bilan birga bildirishnoma keladi.`,
    }),
    ru: (s) => ({
      question: 'Как проходит оплата?',
      answer: `После выбора курса открывается заказ на ${s.payment_window_minutes} минут. Вы переводите сумму на указанную карту и загружаете скриншот чека. Чек уходит на проверку администратору, и после подтверждения курс открывается сразу. При отказе придёт уведомление с указанием причины.`,
    }),
    en: (s) => ({
      question: 'How does payment work?',
      answer: `Choosing a course opens an order that stays valid for ${s.payment_window_minutes} minutes. You transfer the amount to the card shown and upload a screenshot of the receipt. An admin reviews it, and the course unlocks immediately once it is approved. If it is rejected you get a notification explaining why.`,
    }),
  },
  'default-timer': {
    uz: () => ({
      question: 'To‘lov vaqti tugab qolsa nima bo‘ladi?',
      answer:
        'Buyurtma muddati tugasa u "expired" holatiga o‘tadi va siz yangi buyurtma yaratishingiz mumkin. Vaqt server soatiga qarab hisoblanadi. Chekni yuborib ulgursangiz, admin tekshiruvi tugaguncha buyurtma bekor bo‘lmaydi.',
    }),
    ru: () => ({
      question: 'Что будет, если время оплаты истечёт?',
      answer:
        'Заказ перейдёт в статус «expired», и вы сможете создать новый. Время считается по серверным часам. Если вы успели отправить чек, заказ не отменится до окончания проверки администратором.',
    }),
    en: () => ({
      question: 'What happens if the payment window runs out?',
      answer:
        'The order moves to the "expired" status and you can simply create a new one. The countdown follows the server clock. If you managed to submit the receipt in time, the order will not expire while an admin is reviewing it.',
    }),
  },
  'default-certificate': {
    uz: () => ({
      question: 'Sertifikat qachon beriladi?',
      answer:
        'Sertifikat kurs 100% tugallanganda, barcha modullar yakunlanganda, barcha majburiy testlar o‘tilganda hamda kerakli backtest va Trading Journal topshiriqlari bajarilganda ochiladi. Har bir sertifikatning ID va QR kodi bor — uni /certificate/verify sahifasida har kim tekshira oladi.',
    }),
    ru: () => ({
      question: 'Когда выдаётся сертификат?',
      answer:
        'Сертификат открывается, когда курс пройден на 100%, завершены все модули, сданы все обязательные тесты и выполнены задания по бэктесту и Trading Journal. У каждого сертификата есть ID и QR-код — проверить его может любой на странице /certificate/verify.',
    }),
    en: () => ({
      question: 'When do I get the certificate?',
      answer:
        'The certificate unlocks when the course is 100% complete, every module is finished, every required test is passed and the backtest and Trading Journal assignments are submitted. Each certificate carries an ID and a QR code — anyone can check it at /certificate/verify.',
    }),
  },
  'default-risk': {
    uz: () => ({
      question: 'Kurs daromadni kafolatlaydimi?',
      answer:
        'Yo‘q. NEW ERA — ta’lim platformasi. Kurs materiallari moliyaviy maslahat yoki kafolatlangan daromad va’dasi emas. Trading yuqori darajadagi riskni o‘z ichiga oladi va har qanday savdo qarori foydalanuvchining shaxsiy javobgarligida.',
    }),
    ru: () => ({
      question: 'Гарантирует ли курс доход?',
      answer:
        'Нет. NEW ERA — образовательная платформа. Материалы курса не являются финансовой консультацией и не обещают гарантированного дохода. Торговля связана с высоким риском, и любое торговое решение остаётся личной ответственностью пользователя.',
    }),
    en: () => ({
      question: 'Does the course guarantee profit?',
      answer:
        'No. NEW ERA is an education platform. The course material is not financial advice and promises no guaranteed income. Trading carries a high level of risk, and every trading decision remains the user’s own responsibility.',
    }),
  },
  'default-support': {
    uz: (s) => ({
      question: 'Qo‘llab-quvvatlash bilan qanday bog‘lanaman?',
      answer: `Kabinetdagi "Xabarlar" bo‘limi orqali to‘g‘ridan-to‘g‘ri yozishingiz mumkin — savolingiz to‘g‘ridan-to‘g‘ri adminga tushadi. Email: ${s.support_email}.`,
    }),
    ru: (s) => ({
      question: 'Как связаться с поддержкой?',
      answer: `Напишите напрямую через раздел «Сообщения» в личном кабинете — вопрос попадёт сразу администратору. Email: ${s.support_email}.`,
    }),
    en: (s) => ({
      question: 'How do I contact support?',
      answer: `Write to us from the "Messages" section of your dashboard — it goes straight to an admin. Email: ${s.support_email}.`,
    }),
  },
};

const ORDER = [
  'default-flow',
  'default-passing',
  'default-retake',
  'default-xp',
  'default-payment',
  'default-timer',
  'default-certificate',
  'default-risk',
  'default-support',
] as const;

export async function buildDefaultFaq(locale: Locale = DEFAULT_LOCALE): Promise<FaqEntry[]> {
  const s = await db.getSettings();

  return ORDER.map((id) => {
    const copy = DEFAULTS[id][locale] ?? DEFAULTS[id][DEFAULT_LOCALE];
    return { id, ...copy(s) };
  });
}

/** Admin FAQs when present, otherwise the generated defaults. */
export async function getFaqEntries(locale: Locale = DEFAULT_LOCALE): Promise<FaqEntry[]> {
  const stored: LocalFaq[] = await db.getFaqs(true);

  if (!stored.length) return buildDefaultFaq(locale);

  return stored.map((faq) => ({
    id: faq.id,
    question:
      (locale === 'ru' && faq.question_ru) || (locale === 'en' && faq.question_en) || faq.question_uz,
    answer:
      (locale === 'ru' && faq.answer_ru) || (locale === 'en' && faq.answer_en) || faq.answer_uz,
  }));
}

/**
 * FAQ rows in storage shape, for the UI that renders LocalFaq directly.
 * Falls back to the generated defaults so a fresh install is never blank.
 *
 * The generated fallback is written into the requested locale's columns as
 * well as the Uzbek ones, so a caller that reads `question_ru` still gets
 * Russian copy rather than dropping back to Uzbek.
 */
export async function getFaqRows(locale: Locale = DEFAULT_LOCALE): Promise<LocalFaq[]> {
  const stored = await db.getFaqs(true);
  if (stored.length) return stored;

  const [fallback, uz] = await Promise.all([buildDefaultFaq(locale), buildDefaultFaq('uz')]);

  return fallback.map((entry, index) => ({
    id: entry.id,
    question_uz: uz[index].question,
    answer_uz: uz[index].answer,
    ...(locale === 'ru' ? { question_ru: entry.question, answer_ru: entry.answer } : {}),
    ...(locale === 'en' ? { question_en: entry.question, answer_en: entry.answer } : {}),
    order_index: index + 1,
    published: true,
  }));
}
