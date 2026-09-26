'use client';

import { useState } from 'react';
import type { LocalFaq } from '@/types/admin';
import { Plus, Trash2, Edit3, HelpCircle, Save, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AdminFAQClientProps {
  initialItems: LocalFaq[];
}

export default function AdminFAQClient({ initialItems }: AdminFAQClientProps) {
  const [items, setItems] = useState<LocalFaq[]>(initialItems);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [questionUz, setQuestionUz] = useState('');
  const [questionRu, setQuestionRu] = useState('');
  const [questionEn, setQuestionEn] = useState('');
  const [answerUz, setAnswerUz] = useState('');
  const [answerRu, setAnswerRu] = useState('');
  const [answerEn, setAnswerEn] = useState('');

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionUz.trim() || !answerUz.trim()) {
      toast.error('O\'zbek tilidagi savol va javob kiritilishi shart');
      return;
    }

    setLoading(true);
    try {
      // faqSchema treats the ru/en fields as optional, so send undefined —
      // not null — when a translation is left blank.
      const res = await fetch('/api/admin/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_uz: questionUz,
          question_ru: questionRu || undefined,
          question_en: questionEn || undefined,
          answer_uz: answerUz,
          answer_ru: answerRu || undefined,
          answer_en: answerEn || undefined,
          order_index: items.length + 1,
          published: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      toast.success('FAQ savoli qo\'shildi!');
      setItems((prev) => [...prev, data.faq]);
      setQuestionUz('');
      setQuestionRu('');
      setQuestionEn('');
      setAnswerUz('');
      setAnswerRu('');
      setAnswerEn('');
      setShowAddForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Ushbu savolni o\'chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/admin/faq?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O\'chirishda xatolik');
      toast.success('Savol o\'chirildi');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'O\'chirishda xatolik');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black text-white">Ko&apos;p Beriladigan Savollar (FAQ)</h1>
          <p className="text-white/50 text-sm">Bosh sahifa va FAQ bo&apos;limidagi ko&apos;p beriladigan savollar boshqaruvi.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <Plus size={16} /> Yangi Savol Qo&apos;shish
        </button>
      </div>

      {showAddForm && (
        <div className="bg-[#111] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white">Yangi FAQ savolini kiritish</h2>

          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase text-emerald-400 font-bold">O&apos;zbek tilida (Asosiy) *</label>
              <input
                type="text"
                required
                value={questionUz}
                onChange={(e) => setQuestionUz(e.target.value)}
                placeholder="Savol matni (UZ)..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <textarea
                required
                rows={2}
                value={answerUz}
                onChange={(e) => setAnswerUz(e.target.value)}
                placeholder="Javob matni (UZ)..."
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-white/50">Русский (Ixtiyoriy)</label>
                <input
                  type="text"
                  value={questionRu}
                  onChange={(e) => setQuestionRu(e.target.value)}
                  placeholder="Вопрос (RU)..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  rows={2}
                  value={answerRu}
                  onChange={(e) => setAnswerRu(e.target.value)}
                  placeholder="Ответ (RU)..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-white/50">English (Optional)</label>
                <input
                  type="text"
                  value={questionEn}
                  onChange={(e) => setQuestionEn(e.target.value)}
                  placeholder="Question (EN)..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  rows={2}
                  value={answerEn}
                  onChange={(e) => setAnswerEn(e.target.value)}
                  placeholder="Answer (EN)..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAQ Items List */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={item.id} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 font-bold">#{idx + 1}</span>
                <h3 className="font-bold text-white text-base">{item.question_uz}</h3>
              </div>
              <p className="text-xs text-white/60 leading-relaxed pl-6">{item.answer_uz}</p>
            </div>

            <button
              onClick={() => handleDeleteItem(item.id)}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition border border-rose-500/20"
              title="O'chirish"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
