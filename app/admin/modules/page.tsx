import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';
import Link from 'next/link';
import { Layers, Plus, BookOpen, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminModulesPage() {
  await requireAdminPage();

  // Real modules from the seeded TZ §5 curriculum, with real lesson counts.
  const allModules = (
    await Promise.all(
      (await db.getCourses()).map(async (course) =>
        Promise.all(
          (await db.getModules(course.id)).map(async (module) => ({
            id: module.id,
            title: module.title,
            description: module.description || '',
            order_index: module.order_index,
            course_id: course.id,
            course_title: course.title,
            course_level: course.level,
            lesson_count: (await db.getLessons(module.id)).length,
          }))
        )
      )
    )
  ).flat();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Modullar Boshqaruvi</h1>
          <p className="text-white/50 text-sm">Barcha kurslar bo&apos;yicha modullar strukturasi, darslar soni va tartibi.</p>
        </div>
        <Link
          href="/admin/courses"
          className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xl flex items-center gap-1.5"
        >
          <BookOpen size={16} /> Kurslar Orqali Boshqarish
        </Link>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allModules.map((m) => (
          <div
            key={m.id}
            className="bg-[#000000] border border-white/15 rounded-3xl p-6 flex flex-col justify-between hover:border-white/40 transition duration-300 shadow-2xl space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {m.course_title}
                </span>
                <span className="text-xs font-mono text-white/40">#{m.order_index}</span>
              </div>
              <h3 className="text-base font-black text-white mb-2 leading-snug">{m.title}</h3>
              <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{m.description}</p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/40 font-mono font-bold">
                {m.lesson_count} ta dars
              </span>
              <Link
                href={`/admin/courses/${m.course_id}`}
                className="text-xs font-bold text-white hover:underline flex items-center gap-1 font-mono"
              >
                Tahrirlash <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
