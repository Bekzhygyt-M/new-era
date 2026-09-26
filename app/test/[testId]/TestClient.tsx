'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, RotateCcw, Award, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Test stepper (TZ §7.4, §7.5, §13).
 *
 * Scoring happens entirely on the server; this component only collects the
 * chosen answer ids and renders whatever verdict comes back.
 */

interface Question {
  id: string;
  question: string;
  points: number;
  multiple: boolean;
  answers: { id: string; answer: string }[];
}

interface Result {
  score: number;
  passed: boolean;
  passingScore: number;
  correctCount: number;
  totalQuestions: number;
  xpAwarded: number;
  totalXp: number;
  level: string;
  outcome: 'rewatch' | 'retry' | 'passed';
  outcomeMessage: string;
  nextLessonId: string | null;
  moduleCompleted: boolean;
  courseCompleted: boolean;
  certificateId: string | null;
  telegramChannelUrl?: string;
}

interface Props {
  testId: string;
  testTitle: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  passingScore: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  bestScore: number;
}

export default function TestClient({
  testId,
  testTitle,
  lessonId,
  lessonTitle,
  courseId,
  passingScore,
  maxAttempts,
  attemptsUsed,
  bestScore,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/test/start?testId=${encodeURIComponent(testId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('test.loadFailed'));
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setQuestions(data.questions || []);
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [testId]);

  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const question = questions[current];

  const submit = async () => {
    if (answeredCount < total) {
      toast.error(`Barcha savollarga javob bering (${answeredCount}/${total})`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, answers }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t('test.submitFailed'));
        return;
      }

      setResult(data);
      router.refresh();
    } catch {
      toast.error('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-white/40">
        <Loader2 size={24} className="animate-spin" />
        <p className="text-sm">{t('test.loading')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-6 text-center">
        <XCircle size={24} className="mx-auto mb-3 text-red-400" />
        <p className="mb-4 text-sm font-semibold text-white">{loadError}</p>
        <Link
          href={`/lesson/${lessonId}`}
          className="inline-flex rounded-xl border border-white/15 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-white"
        >
          {t('test.backToLesson')}
        </Link>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (result) {
    const tone = result.passed
      ? { border: 'border-emerald-400/30', bg: 'bg-emerald-400/[0.06]', text: 'text-emerald-300' }
      : result.outcome === 'retry'
        ? { border: 'border-amber-400/30', bg: 'bg-amber-400/[0.06]', text: 'text-amber-300' }
        : { border: 'border-red-500/30', bg: 'bg-red-500/[0.06]', text: 'text-red-300' };

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-7 text-center`}>
          {result.passed ? (
            <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-400" />
          ) : (
            <XCircle size={40} className={`mx-auto mb-4 ${tone.text}`} />
          )}

          <div className="mb-1 font-mono text-5xl font-black text-white">{result.score}%</div>
          <p className="mb-4 text-[13px] text-white/50">
            {result.correctCount} / {result.totalQuestions} {t('test.correct')} · {t('test.passingScore')} {result.passingScore}%
          </p>
          <p className={`text-sm font-bold ${tone.text}`}>{result.outcomeMessage}</p>

          {result.xpAwarded > 0 && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white">
              +{result.xpAwarded} XP · {result.totalXp} XP · {result.level}
            </p>
          )}
        </div>

        {result.courseCompleted && result.certificateId && (
          <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 text-center">
            <Award size={22} className="mx-auto mb-2 text-white" />
            <p className="mb-3 text-sm font-bold text-white">{t('test.courseDone')}</p>
            <Link
              href={`/certificate/${result.certificateId}`}
              className="inline-flex rounded-xl bg-white px-6 py-3 text-[11px] font-black uppercase tracking-wider text-black"
            >
              {t('test.openCertificate')}
            </Link>
          </div>
        )}

        {/* Telegram Channel Gateway after passing test */}
        {result.passed && (
          <div className="rounded-2xl border border-pink-500/40 bg-gradient-to-r from-pink-950/30 via-black to-emerald-950/30 p-6 text-center space-y-3 shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles size={13} className="text-pink-400" />
              {result.score >= 90 ? '90%+ Natija: Yopiq Kanal Ochildi!' : 'Test Muvaffaqiyatli Topshirildi!'}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {result.score >= 90
                ? 'Tabriklaymiz! Siz 90% dan yuqori natija ko‘rsatdingiz'
                : 'Tabriklaymiz! Testdan muvaffaqiyatli o‘tdingiz'}
            </h3>
            <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
              Maxsus amaliy tahlillar, mentor tavsiyalari va muhokamalar olib boriladigan rasmiy Telegram kanaliga qo‘shiling:
            </p>
            <div className="pt-2">
              <a
                href={result.telegramChannelUrl || 'https://t.me/newera_trading'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition transform hover:scale-[1.02]"
              >
                <Send size={15} />
                <span>Yopiq Telegram Kanaliga Kirish</span>
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {result.passed ? (
            result.nextLessonId ? (
              <Link
                href={`/lesson/${result.nextLessonId}`}
                className="flex-1 rounded-xl bg-white py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
              >
                Keyingi dars
              </Link>
            ) : (
              <Link
                href={`/course/${courseId}`}
                className="flex-1 rounded-xl bg-white py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
              >
                Kursga qaytish
              </Link>
            )
          ) : (
            <>
              <Link
                href={`/lesson/${lessonId}`}
                className="flex-1 rounded-xl border border-white/15 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-white transition hover:border-white/35"
              >
                Darsni qayta ko‘rish
              </Link>
              {result.outcome === 'retry' && (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setCurrent(0);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
                >
                  <RotateCcw size={13} /> Qayta topshirish
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Stepper ────────────────────────────────────────────────────────────────
  if (!question) {
    return (
      <div className="rounded-2xl border border-dashed border-white/12 p-10 text-center text-sm text-white/45">
        Bu testda hali savollar yo‘q.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <Link
          href={`/lesson/${lessonId}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white"
        >
          <ChevronLeft size={13} /> {lessonTitle}
        </Link>

        <h1 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">{testTitle}</h1>

        <p className="mt-1.5 text-[12px] text-white/40">
          {total} ta savol · o‘tish bali {passingScore}%
          {maxAttempts ? ` · urinish ${attemptsUsed}/${maxAttempts}` : ''}
          {bestScore > 0 ? ` · ${t('test.bestScore')} ${bestScore}%` : ''}
        </p>
      </header>

      {/* Progress */}
      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-white/45">
          <span>
            {t('test.question')} {current + 1} / {total}
          </span>
          <span className="font-mono">
            {answeredCount} javob berildi
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
      >
        <fieldset>
          <legend className="mb-5 text-[15px] font-bold leading-relaxed text-white">
            {question.question}
          </legend>

          <div className="space-y-2.5">
            {question.answers.map((answer, index) => {
              const selected = answers[question.id] === answer.id;

              return (
                <label
                  key={answer.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${
                    selected
                      ? 'border-white bg-white/[0.07]'
                      : 'border-white/10 bg-white/[0.015] hover:border-white/25'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={answer.id}
                    checked={selected}
                    onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: answer.id }))}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black ${
                      selected ? 'border-white bg-white text-black' : 'border-white/20 text-white/50'
                    }`}
                    aria-hidden="true"
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-white/80">{answer.answer}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-white/70 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={13} /> Orqaga
        </button>

        {current < total - 1 ? (
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
          >
            Keyingi <ChevronRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting || answeredCount < total}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-black/40"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Yakunlash
          </button>
        )}
      </div>

      {/* Question jump grid */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, index) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`${t('test.question')} ${index + 1}`}
            className={`h-8 w-8 rounded-lg border text-[11px] font-bold transition ${
              index === current
                ? 'border-white bg-white text-black'
                : answers[q.id]
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-white/10 text-white/35 hover:border-white/25'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
