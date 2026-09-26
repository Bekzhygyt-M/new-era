'use client';

import { useState, useEffect } from 'react';
import type { AdminLessonOption } from '@/types/admin';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ChevronLeft, Plus, Trash2, CheckCircle2, Save, RefreshCw, FolderCheck, Send, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionState {
  question: string;
  answers: { text: string; isCorrect: boolean }[];
}

interface ModuleOption {
  id: string;
  title: string;
  courseTitle?: string | null;
}

export default function AdminCreateTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [lessons, setLessons] = useState<AdminLessonOption[]>([]);

  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [lessonId, setLessonId] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [passingScore, setPassingScore] = useState<number>(90);

  const [questions, setQuestions] = useState<QuestionState[]>([
    {
      question: '',
      answers: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [modRes, lesRes] = await Promise.all([
          fetch('/api/admin/modules', { cache: 'no-store' }),
          fetch('/api/admin/lessons', { cache: 'no-store' }),
        ]);

        if (modRes.ok) {
          const modData = await modRes.json();
          setModules(modData.modules || []);
        }

        if (lesRes.ok) {
          const lesData = await lesRes.json();
          const list: AdminLessonOption[] = lesData.lessons || [];
          setLessons(list);
          if (list.length > 0) {
            setLessonId(list[0].id);
            setTestTitle(`${list[0].title} Testi`);
          }
        }
      } catch {
        toast.error('Modullar va darslar ro‘yxatini yuklab bo‘lmadi');
      }
    }
    loadData();
  }, []);

  // Filter lessons by module
  const filteredLessons = selectedModuleId === 'all'
    ? lessons
    : lessons.filter((l) => l.module_id === selectedModuleId);

  const handleModuleChange = (newModuleId: string) => {
    setSelectedModuleId(newModuleId);
    const available = newModuleId === 'all'
      ? lessons
      : lessons.filter((l) => l.module_id === newModuleId);

    if (available.length > 0) {
      setLessonId(available[0].id);
      setTestTitle(`${available[0].title} Testi`);
    } else {
      setLessonId('');
      setTestTitle('');
    }
  };

  const handleLessonChange = (newLessonId: string) => {
    setLessonId(newLessonId);
    const sel = lessons.find((l) => l.id === newLessonId);
    if (sel) {
      setTestTitle(`${sel.title} Testi`);
    }
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question: '',
        answers: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (qIdx: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIdx].question = text;
      return updated;
    });
  };

  const handleAnswerTextChange = (qIdx: number, aIdx: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIdx].answers[aIdx].text = text;
      return updated;
    });
  };

  const handleCorrectAnswerSelect = (qIdx: number, aIdx: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIdx].answers = updated[qIdx].answers.map((a, i) => ({
        ...a,
        isCorrect: i === aIdx,
      }));
      return updated;
    });
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId) {
      toast.error('Iltimos tegishli darsni tanlang');
      return;
    }

    if (!testTitle.trim()) {
      toast.error('Test sarlavhasini kiriting');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        toast.error(`${i + 1}-savol matnini kiriting`);
        return;
      }
      const hasCorrect = questions[i].answers.some((a) => a.isCorrect);
      if (!hasCorrect) {
        toast.error(`${i + 1}-savol uchun to‘g‘ri javob belgilanishi shart`);
        return;
      }
      for (let j = 0; j < questions[i].answers.length; j++) {
        if (!questions[i].answers[j].text.trim()) {
          toast.error(`${i + 1}-savolning ${j + 1}-javob variantini to'ldiring`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          title: testTitle,
          passing_score: passingScore || 90,
          is_published: true,
          questions: questions.map((q) => ({
            question: q.question,
            points: 1,
            multiple: false,
            answers: q.answers.map((a) => ({ answer: a.text, is_correct: a.isCorrect })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test yaratishda xatolik');

      toast.success('Test va savollar muvaffaqiyatli saqlandi!');
      router.push('/admin/tests');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test yaratishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <Link
          href="/admin/tests"
          className="text-white/50 hover:text-white text-xs font-bold flex items-center gap-1.5 transition font-mono"
        >
          <ChevronLeft size={16} /> Testlar ro‘yxatiga qaytish
        </Link>
        <span className="text-xs font-mono text-pink-400 font-bold uppercase">To‘liq Test Konstruktori</span>
      </div>

      <div className="bg-[#0c0c0c] border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">Yangi Test Yaratish</h1>
          <p className="text-xs text-white/50 mt-1.5">
            Modul va darsni tanlang hamda 90% talabiga ega amaliy imtihon savollarini kiriting.
          </p>
        </div>

        {/* Telegram Gateway Note */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-black to-emerald-500/10 border border-pink-500/30 text-xs space-y-1.5 shadow-lg">
          <div className="flex items-center gap-2 font-black text-pink-400 font-mono uppercase">
            <Send size={15} />
            <span>Test Yakunida: Telegram Kanal Ochiladi</span>
          </div>
          <p className="text-white/70 leading-relaxed">
            Talaba ushbu testdan <strong>90% yoki undan yuqori</strong> to‘plagan zahoti, unga <strong>Yopiq Telegram Kanaliga Kirish</strong> tugmasi beriladi. Hech qanday YouTube havolasi emas, faqat tizimda belgilangan Telegram kanal ochiladi.
          </p>
        </div>

        <form onSubmit={handleSaveTest} className="space-y-8">
          {/* Step 1 & Step 2: Module & Lesson selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/50 border border-white/10 rounded-2xl p-5 sm:p-6">
            {/* Module Picker */}
            <div>
              <label className="block text-xs font-mono uppercase text-white/70 mb-2 font-bold flex items-center gap-1.5">
                <FolderCheck size={14} className="text-pink-400" />
                1. Modulni Tanlang
              </label>
              <select
                value={selectedModuleId}
                onChange={(e) => handleModuleChange(e.target.value)}
                className="w-full bg-[#111] border border-white/15 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-pink-500 transition"
              >
                <option value="all">Barcha Modullar ({modules.length} ta)</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.courseTitle ? `[${m.courseTitle}] ` : ''}{m.title}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-white/40 mt-1 block">Darslarni modul bo‘yicha filtrlash</span>
            </div>

            {/* Lesson Picker */}
            <div>
              <label className="block text-xs font-mono uppercase text-white/70 mb-2 font-bold flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-400" />
                2. Darsni Tanlang *
              </label>
              <select
                required
                value={lessonId}
                onChange={(e) => handleLessonChange(e.target.value)}
                className="w-full bg-[#111] border border-white/15 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition"
              >
                {filteredLessons.length === 0 ? (
                  <option value="">Bu modulda darslar yo‘q</option>
                ) : (
                  filteredLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} {l.hasTest ? '(✓ Test bor)' : '(⭐ Test kiritish kerak)'}
                    </option>
                  ))
                )}
              </select>
              <span className="text-[10px] text-white/40 mt-1 block">
                Tanlangan darsga test biriktiriladi
              </span>
            </div>

            {/* Test Title */}
            <div>
              <label className="block text-xs font-mono uppercase text-white/70 mb-2 font-bold">
                Test Sarlavhasi *
              </label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Masalan: Market Structure Testi"
                className="w-full bg-[#111] border border-white/15 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-white transition"
              >
              </input>
            </div>

            {/* Passing Score */}
            <div>
              <label className="block text-xs font-mono uppercase text-white/70 mb-2 font-bold flex items-center justify-between">
                <span>O‘tish Bali (%)</span>
                <span className="text-[10px] text-pink-400 font-bold">Qat&apos;iy talab: 90%</span>
              </label>
              <input
                type="number"
                min="50"
                max="100"
                required
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value) || 90)}
                className="w-full bg-[#111] border border-white/15 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-pink-500 transition font-bold"
              />
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-6 pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 font-mono uppercase">
                  <Sparkles size={18} className="text-pink-400" />
                  Savollar Ro‘yxati ({questions.length} ta savol)
                </h2>
                <p className="text-xs text-white/40">Har bir savol uchun variantlarni kiriting va to‘g‘ri javobni tanlang.</p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-black rounded-xl transition flex items-center gap-1.5 uppercase font-mono shadow-md"
              >
                <Plus size={14} /> Yangi Savol Qo‘shish
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-black/60 border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 relative shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-mono font-black text-pink-400 uppercase tracking-wider">
                    Savol #{qIdx + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-rose-400 hover:text-rose-300 p-1 flex items-center gap-1 text-xs font-mono"
                      title="Savolni o‘chirish"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">O‘chirish</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/50 mb-1.5">Savol Matni *</label>
                  <input
                    type="text"
                    required
                    value={q.question}
                    onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                    placeholder="Savol matnini bu yerga yozing..."
                    className="w-full bg-[#111] border border-white/15 rounded-xl px-4 py-3 text-white text-xs font-mono focus:outline-none focus:border-white transition"
                  />
                </div>

                {/* Answers Options */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-mono uppercase text-white/50 block font-bold">
                    Javob Variantlari (To‘g‘ri javobni doirachaga bosing):
                  </span>
                  {q.answers.map((ans, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleCorrectAnswerSelect(qIdx, aIdx)}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition flex-shrink-0 ${
                          ans.isCorrect
                            ? 'bg-pink-500 border-pink-500 text-white shadow-lg'
                            : 'border-white/25 hover:border-white/50 text-transparent bg-white/5'
                        }`}
                        title={ans.isCorrect ? 'To‘g‘ri javob' : 'To‘g‘ri deb belgilash'}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <input
                        type="text"
                        required
                        value={ans.text}
                        onChange={(e) => handleAnswerTextChange(qIdx, aIdx, e.target.value)}
                        placeholder={`Variant ${String.fromCharCode(65 + aIdx)} (masalan: Bullish Order Block)`}
                        className={`flex-1 bg-[#111] border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition font-mono ${
                          ans.isCorrect ? 'border-pink-500/60 bg-pink-500/[0.05]' : 'border-white/10'
                        }`}
                      />
                      {ans.isCorrect && (
                        <span className="hidden sm:inline-block text-[10px] font-mono text-pink-400 font-bold uppercase tracking-wider">
                          To‘g‘ri Javob
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
            <div className="text-xs text-white/40 font-mono flex items-center gap-1.5">
              <HelpCircle size={14} />
              Savollar saqlangach, talabalar darsni ko‘rib testni yechishi mumkin bo‘ladi.
            </div>

            <button
              type="submit"
              disabled={loading || !lessonId}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl flex items-center justify-center gap-2 font-mono disabled:opacity-50"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Testni Saqlash va Faollashtirish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
