'use client';

import { useState } from 'react';
import type { AdminCourseDetail } from '@/types/admin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Save, 
  Plus, 
  BookOpen, 
  PlayCircle, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw,
  Eye,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminCourseEditClientProps {
  initialCourse: AdminCourseDetail;
}

export default function AdminCourseEditClient({ initialCourse }: AdminCourseEditClientProps) {
  const router = useRouter();
  const [course, setCourse] = useState(initialCourse);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [shortDesc, setShortDesc] = useState(course.short_description || '');
  const [description, setDescription] = useState(course.description || '');
  const [level, setLevel] = useState<string>(course.level || 'beginner');
  const [price, setPrice] = useState(String(course.price || 0));
  const [currency, setCurrency] = useState(course.currency || 'UZS');
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || '');
  const [published, setPublished] = useState(!!course.published);
  const [featured, setFeatured] = useState(!!course.featured);

  // Module creation modal state
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [isAddingModule, setIsAddingModule] = useState(false);

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: course.id,
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

      toast.success('Kurs ma\'lumotlari saqlandi!');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error('Modul nomini kiriting');
      return;
    }

    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          title: newModuleTitle,
          order_index: (course.modules?.length || 0) + 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Modul yaratishda xatolik');

      toast.success('Yangi modul qo\'shildi');
      setCourse((prev) => ({
        ...prev,
        modules: [...(prev.modules || []), { ...data.module, lessons: [] }],
      }));
      setNewModuleTitle('');
      setIsAddingModule(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Modul yaratishda xatolik');
    }
  };

  const sortedModules = [...(course.modules || [])].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <Link
          href="/admin/courses"
          className="text-white/50 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ChevronLeft size={16} /> Kurslar ro&apos;yxatiga qaytish
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/courses/${course.id}`}
            target="_blank"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-1.5 transition"
          >
            <Eye size={14} /> Saytda ko&apos;rish
          </Link>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <h1 className="text-2xl font-black text-white mb-6">Kursni tahrirlash: {course.title}</h1>

        <form onSubmit={handleUpdateCourse} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Kurs nomi *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Qisqa tavsif</label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">To&apos;liq tavsif</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Daraja</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="beginner">Beginner</option>
                <option value="pro">PRO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Narx (UZS)</label>
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
              Chop etilgan (Published)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
              />
              Featured (Tavsiya etiladi)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              O&apos;zgarishlarni saqlash
            </button>
          </div>
        </form>
      </div>

      {/* Modules and Lessons Manager */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-400" />
            Kurs Modullari va Darslari ({sortedModules.length} modul)
          </h2>
          <button
            type="button"
            onClick={() => setIsAddingModule(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-1.5 transition"
          >
            <Plus size={14} /> Modul qo&apos;shish
          </button>
        </div>

        {/* Add Module Input */}
        {isAddingModule && (
          <div className="bg-black/50 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="Yangi modul nomi (masalan: Module 01: Texnik Tahlil)"
              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddModule}
                className="px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-xl hover:bg-emerald-400 transition"
              >
                Qo&apos;shish
              </button>
              <button
                onClick={() => setIsAddingModule(false)}
                className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl hover:bg-white/10"
              >
                Bekor
              </button>
            </div>
          </div>
        )}

        {/* Modules Accordion/List */}
        <div className="space-y-4">
          {sortedModules.map((m) => (
            <div key={m.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-bold text-white text-base">{m.title}</h3>
                <Link
                  href={`/admin/lessons/create?courseId=${course.id}&moduleId=${m.id}`}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1 transition"
                >
                  <Plus size={12} /> Dars qo&apos;shish
                </Link>
              </div>

              {/* Lessons inside module */}
              <div className="space-y-2">
                {!m.lessons || m.lessons.length === 0 ? (
                  <p className="text-xs text-white/40 italic py-2">Ushbu modulda darslar mavjud emas.</p>
                ) : (
                  m.lessons.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-3.5 bg-black/40 hover:bg-white/[0.04] rounded-xl border border-white/5 text-xs transition group"
                    >
                      <div className="flex items-center gap-3">
                        <PlayCircle size={16} className="text-emerald-400 flex-shrink-0" />
                        <span className="font-semibold text-white">{l.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/40 font-mono text-[11px]">
                          {Math.floor(l.duration / 60)} daq
                        </span>
                        <span className="text-emerald-400 font-mono font-bold text-[11px]">
                          +{l.xp_reward} XP
                        </span>
                        <Link
                          href={`/admin/lessons/${l.id}`}
                          className="px-2.5 py-1 bg-white/5 hover:bg-emerald-500 hover:text-black text-white/70 rounded-lg transition font-bold"
                        >
                          Tahrirlash →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
