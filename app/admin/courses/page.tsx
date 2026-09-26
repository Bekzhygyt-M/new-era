import { db } from '@/lib/db';
import { Plus, Search, Edit2, PlayCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams?.q || '').toLowerCase().trim();

  let courses = await db.getCourses();

  if (query) {
    courses = courses.filter((c) => 
      c.title.toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query)
    );
  }

  const processedCourses = await Promise.all(
    courses.map(async (course) => {
      const modules = await db.getModules(course.id);
      const lessonCounts = await Promise.all(modules.map(async (m) => (await db.getLessons(m.id)).length));
      return {
        ...course,
        moduleCount: modules.length,
        lessonCount: lessonCounts.reduce((sum, n) => sum + n, 0),
      };
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Kurslar ({courses.length})</h1>
          <p className="text-white/50 text-sm mt-1">Platformadagi barcha kurslarni boshqarish.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <form className="relative flex-grow sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Kurs nomini qidiring..."
              className="w-full bg-[#000000] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors font-mono"
            />
          </form>
          
          <Link 
            href="/admin/courses/create"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-colors shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Yangi kurs</span>
          </Link>
        </div>
      </div>

      <div className="bg-[#000000] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/70">
            <thead className="text-[11px] text-white/40 uppercase font-mono bg-white/[0.03] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Kurs Nomi</th>
                <th className="px-6 py-4 font-bold">Daraja & Narx</th>
                <th className="px-6 py-4 font-bold">Tuzilma</th>
                <th className="px-6 py-4 font-bold">Holat</th>
                <th className="px-6 py-4 text-right font-bold">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {processedCourses.map((course) => (
                <tr key={course.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <Link 
                      href={`/admin/courses/${course.id}`}
                      className="font-bold text-white text-sm mb-1 group-hover:underline block"
                    >
                      {course.title}
                    </Link>
                    <div className="text-[10px] font-mono text-white/30">{course.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-block px-2.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-mono font-bold uppercase tracking-wider w-max border border-white/10">
                        {course.level}
                      </span>
                      <span className="text-white font-mono font-black text-xs">
                        {course.price === 0 ? 'Bepul' : `${new Intl.NumberFormat('uz-UZ').format(course.price)} ${course.currency}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="flex items-center gap-1.5 text-white/80 font-mono">
                        <BookOpen size={12} className="text-white" /> {course.moduleCount} modullar
                      </span>
                      <span className="flex items-center gap-1.5 text-white/50 font-mono">
                        <PlayCircle size={12} /> {course.lessonCount} darslar
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white text-black">
                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      {course.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/admin/courses/${course.id}`}
                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors inline-block border border-white/10" 
                        title="Tahrirlash"
                      >
                        <Edit2 size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              
              {processedCourses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                    Kurslar topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
