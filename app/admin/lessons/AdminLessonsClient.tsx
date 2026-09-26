'use client';

import { useState } from 'react';
import type { AdminLessonRow, LocalCourse } from '@/types/admin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PlayCircle, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  Award, 
  Search, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminLessonsClientProps {
  initialLessons: AdminLessonRow[];
  initialCourses: LocalCourse[];
}

export default function AdminLessonsClient({
  initialLessons,
  initialCourses,
}: AdminLessonsClientProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState<AdminLessonRow[]>(initialLessons || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const [deletingLesson, setDeletingLesson] = useState<AdminLessonRow | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Toggle Publish / Draft
  const handleTogglePublish = (lessonId: string, currentPublished: boolean) => {
    setUpdatingStatusId(lessonId);
    const nextState = !currentPublished;
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, is_published: nextState } : l))
    );
    toast.success(nextState ? 'Dars e\'lon qilindi (Live)' : 'Dars qoralamaga o\'tkazildi (Draft)');
    setUpdatingStatusId(null);
  };

  // Delete Lesson
  const handleDeleteLesson = () => {
    if (!deletingLesson) return;
    setLessons((prev) => prev.filter((l) => l.id !== deletingLesson.id));
    toast.success('Dars ro‘yxatdan o‘chirildi');
    setDeletingLesson(null);
  };

  // Filtering
  const filteredLessons = lessons.filter((l) => {
    const matchesCourse = courseFilter === 'all' || l.modules?.course_id === courseFilter || l.modules?.courses?.id === courseFilter;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'published'
        ? l.is_published
        : !l.is_published;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCourse && matchesStatus;

    const matchesTitle = l.title?.toLowerCase().includes(query);
    const matchesModule = l.modules?.title?.toLowerCase().includes(query);
    const matchesCourseTitle = l.modules?.courses?.title?.toLowerCase().includes(query);

    return matchesCourse && matchesStatus && (matchesTitle || matchesModule || matchesCourseTitle);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Video Darslar Boshqaruvi</h1>
          <p className="text-white/50 text-sm">
            Barcha video darslarni yaratish, tahrirlash, test biriktirish va sozlash markazi.
          </p>
        </div>

        <Link
          href="/admin/lessons/create"
          className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center gap-2"
        >
          <Plus size={16} /> Yangi Dars Qo&apos;shish
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-[#000000] border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="sm:col-span-6 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Dars yoki modul nomini qidiring..."
            className="w-full bg-black border border-white/15 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white transition font-mono"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
          >
            <option value="all">Barcha Kurslar</option>
            <option value="11111111-1111-1111-1111-111111111111">STANDARD TRADING</option>
            <option value="22222222-2222-2222-2222-222222222222">PRO TRADING</option>
            <option value="33333333-3333-3333-3333-333333333333">VIP TRADING</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
          >
            <option value="all">Barcha Holatlar</option>
            <option value="published">E&apos;lon qilingan (Live)</option>
            <option value="draft">Qoralama (Draft)</option>
          </select>
        </div>
      </div>

      {/* Main Lessons Table */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/70">
            <thead className="text-[11px] text-white/40 uppercase font-mono bg-white/[0.03] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Dars & Modul</th>
                <th className="px-6 py-4 font-bold">Davomiyligi</th>
                <th className="px-6 py-4 font-bold">XP & Test</th>
                <th className="px-6 py-4 font-bold">Holat</th>
                <th className="px-6 py-4 text-right font-bold">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredLessons.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02] transition group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                        <PlayCircle size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm group-hover:underline">{l.title}</div>
                        <div className="text-[11px] text-white/40 font-mono">
                          {l.modules?.courses?.title} • {l.modules?.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-white/80">
                    {Math.floor((l.duration || 600) / 60)} daqiqa
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-white/10 border border-white/15 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                        +{l.xp_reward || 100} XP
                      </span>
                      {l.hasTest ? (
                        <span className="text-[10px] text-white/70 font-mono">✓ Test ulangan</span>
                      ) : (
                        <span className="text-[10px] text-white/30 font-mono">Test yo‘q</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleTogglePublish(l.id, l.is_published)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition ${
                        l.is_published
                          ? 'bg-white text-black font-black'
                          : 'bg-white/10 text-white/50 border border-white/15'
                      }`}
                    >
                      {l.is_published ? 'Live (Faol)' : 'Draft (Yopiq)'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/lesson/${l.id}`}
                        className="p-1.5 text-white/40 hover:text-white rounded-lg transition"
                        title="Ko'rish"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/admin/lessons/${l.id}`}
                        className="p-1.5 text-white/40 hover:text-white rounded-lg transition"
                        title="Tahrirlash"
                      >
                        <Edit3 size={15} />
                      </Link>
                      <button
                        onClick={() => setDeletingLesson(l)}
                        className="p-1.5 text-white/40 hover:text-white rounded-lg transition"
                        title="O'chirish"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredLessons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40 font-mono">
                    Darslar topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Darsni o‘chirmoqchimisiz?</h3>
            <p className="text-xs text-white/60">
              &quot;{deletingLesson.title}&quot; darsi o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingLesson(null)}
                className="px-4 py-2 text-xs font-mono text-white/60 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDeleteLesson}
                className="px-5 py-2 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition"
              >
                Ha, o‘chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
