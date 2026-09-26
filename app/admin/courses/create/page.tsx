'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft, Plus, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'beginner' | 'pro'>('beginner');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('UZS');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      toast.error('Kurs nomi va slug kiritilishi shart');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          short_description: shortDesc,
          description,
          level,
          price: parseInt(price, 10) || 0,
          currency,
          thumbnail_url: thumbnailUrl || null,
          published,
          featured,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      toast.success('Kurs muvaffaqiyatli yaratildi!');
      router.push(`/admin/courses`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kurs yaratishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <Link
          href="/admin/courses"
          className="text-white/50 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ChevronLeft size={16} /> Kurslar ro&apos;yxatiga qaytish
        </Link>
        <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Yangi kurs</span>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <h1 className="text-2xl font-black text-white mb-6">Yangi kurs yaratish</h1>

        <form onSubmit={handleCreateCourse} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Kurs nomi *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Masalan: BEGINNER TRADING 2.0"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">URL Slug *</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="beginner-trading"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Qisqa tavsif (Short Description)</label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="Kursning qisqacha maqsadi va afzalliklari..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">To&apos;liq tavsif</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ushbu kurs kimlar uchun, qanday bilimlar beriladi..."
              className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Daraja (Level) *</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as 'beginner' | 'pro')}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="beginner">Beginner</option>
                <option value="pro">PRO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Narx (0 = Bepul) *</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Valyuta</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Thumbnail Rasm URL</label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
              />
              Darhol chop etish (Published)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
              />
              Bosh sahifada ko&apos;rsatish (Featured)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Yaratilmoqda...
                </>
              ) : (
                <>
                  <Save size={16} /> Kursni saqlash
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
