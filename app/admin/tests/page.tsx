import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';
import { Sparkles, Plus, Percent, CheckCircle2, XCircle, FileQuestion, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminTestsPage() {
  await requireAdminPage();

  // Real tests with real attempt statistics (TZ §22.7, §31).
  const attempts = await db.getAllAttempts();
  const tests = await Promise.all(
    (await db.getTests()).map(async (test) => {
      const testAttempts = attempts.filter((a) => a.test_id === test.id);
      const passed = testAttempts.filter((a) => a.passed).length;
      const lesson = await db.getLesson(test.lesson_id);
      const lessonModule = lesson ? await db.getModule(lesson.module_id) : null;
      const course = lessonModule ? await db.getCourse(lessonModule.course_id) : null;

      return {
        id: test.id,
        title: test.title,
        course_title: course?.title || '—',
        lesson_title: lesson?.title || '—',
        questions_count: (await db.getTestQuestions(test.id)).length,
        attempts: testAttempts.length,
        passRate: testAttempts.length ? Math.round((passed / testAttempts.length) * 100) : 0,
        passing_score: test.passing_score,
      };
    })
  );


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Testlar Boshqaruvi va Analitika</h1>
          <p className="text-white/50 text-sm">Dars testlari, savollar bazasi va talabalarning 90%+ topshirish statistikasi.</p>
        </div>
        <Link
          href="/admin/tests/create"
          className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center gap-2"
        >
          <Plus size={16} /> Yangi Test Yaratish
        </Link>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((t) => (
          <div
            key={t.id}
            className="bg-[#000000] border border-white/15 rounded-3xl p-6 flex flex-col justify-between hover:border-white/40 transition duration-300 shadow-2xl space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest font-bold">
                  {t.course_title}
                </span>
                <span className="text-xs font-mono text-white/40">
                  {t.questions_count} ta savol
                </span>
              </div>

              <h3 className="text-base font-black text-white mb-1 leading-snug">{t.title}</h3>
              <p className="text-xs text-white/50 mb-4 truncate font-mono">{t.lesson_title}</p>

              <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/10 rounded-2xl p-3 text-center mb-4">
                <div>
                  <span className="text-[10px] text-white/40 block uppercase font-mono">O&apos;tish foizi</span>
                  <span className="text-base font-black font-mono text-white">
                    {t.passRate}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block uppercase font-mono">Urinishlar</span>
                  <span className="text-base font-black text-white font-mono">{t.attempts}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-white/40 font-mono">Min talab: {t.passing_score}%</span>
              <Link
                href={`/test/${t.id}`}
                target="_blank"
                className="text-xs font-bold text-white hover:underline flex items-center gap-1 font-mono"
              >
                Topshirib ko&apos;rish <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
