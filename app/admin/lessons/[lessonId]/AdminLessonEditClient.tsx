'use client';

import { useState, useRef } from 'react';
import type { LocalLesson, AdminModuleOption, AdminTestDetail, TestQuestionDraft, TestAnswerDraft } from '@/types/admin';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlayCircle, 
  ChevronLeft, 
  Save, 
  RefreshCw, 
  UploadCloud, 
  FileVideo, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  HelpCircle,
  Film,
  Clock,
  Trash2,
  Plus,
  Check,
  Award,
  AlertTriangle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminLessonEditClientProps {
  initialLesson: LocalLesson;
  modules: AdminModuleOption[];
  initialTest: AdminTestDetail | null;
}

export default function AdminLessonEditClient({
  initialLesson,
  modules,
  initialTest,
}: AdminLessonEditClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'lesson' | 'test'>('lesson');

  // Lesson states
  const [lesson, setLesson] = useState(initialLesson);
  const [moduleId, setModuleId] = useState(lesson.module_id || '');
  const [title, setTitle] = useState(lesson.title || '');
  const [shortDescription, setShortDescription] = useState(lesson.short_description || '');
  const [description, setDescription] = useState(lesson.description || '');
  const [orderIndex, setOrderIndex] = useState(String(lesson.order_index || 1));
  const [xpReward, setXpReward] = useState(String(lesson.xp_reward || 100));

  // Video states
  const [videoSourceType, setVideoSourceType] = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
  const [videoStoragePath, setVideoStoragePath] = useState(lesson.video_storage_path || '');
  const [durationSeconds, setDurationSeconds] = useState(lesson.duration || 600);
  const [watchRequirement, setWatchRequirement] = useState(lesson.watch_requirement || 90);
  const [isPublished, setIsPublished] = useState(lesson.is_published ?? true);
  const [previewEnabled, setPreviewEnabled] = useState(lesson.preview_enabled ?? false);
  const [allowSeeking, setAllowSeeking] = useState(lesson.allow_seeking ?? false);

  // Helper for YouTube ID extraction
  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return match ? match[1] : null;
  };

  // Video upload / replace states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(lesson.video_url || null);
  const [fileMeta, setFileMeta] = useState<{ name: string; sizeMb: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<boolean>(false);

  // Modals
  const [showDeleteLessonModal, setShowDeleteLessonModal] = useState(false);
  const [showDeleteVideoModal, setShowDeleteVideoModal] = useState(false);

  // Test states
  const [test, setTest] = useState<AdminTestDetail | null>(initialTest);
  const [testTitle, setTestTitle] = useState(initialTest?.title || `${lesson.title} Testi`);
  // TZ §13 — the platform-wide passing score is 90%.
  const [testPassingScore, setTestPassingScore] = useState(initialTest?.passing_score || 90);
  const [questions, setQuestions] = useState<TestQuestionDraft[]>(
    initialTest?.questions?.map((q: TestQuestionDraft) => ({
      id: q.id,
      question: q.question,
      order_index: q.order_index,
      answers: q.answers?.map((a: TestAnswerDraft) => ({
        id: a.id,
        answer: a.answer,
        is_correct: a.is_correct,
      })) || [],
    })) || []
  );

  // Handle Video Selection & Metadata Extraction
  const handleVideoSelect = (file: File) => {
    const validMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validMimes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
      toast.error('Faqat MP4, WebM yoki MOV formatidagi video fayllar qo\'llab-quvvatlanadi.');
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    if (file.size > 6 * 1024 * 1024) {
      toast.error(`Fayl hajmi ${sizeMb} MB. Serverless hosting cheklovi sababli 6 MB dan katta videolarni to‘g‘ridan-to‘g‘ri yuklab bo‘lmaydi. Iltimos videoni YouTube-ga 'Dostup po ssylke' (Unlisted) qilib yuklang va "Video Havolasi" tabidan foydalaning!`, { duration: 8000 });
      return;
    }

    setVideoFile(file);
    setFileMeta({ name: file.name, sizeMb: `${sizeMb} MB` });

    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);

    // Auto-detect duration
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration && !isNaN(tempVideo.duration)) {
        const secs = Math.round(tempVideo.duration);
        setDurationSeconds(secs);
        toast.success(`Video davomiyligi: ${Math.floor(secs / 60)} daqiqa ${secs % 60} soniya`);
      }
    };
  };

  const startVideoUpload = async () => {
    if (!videoFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    uploadAbortRef.current = false;

    try {
      // Real upload with real progress (TZ §22.6) — the file is stored
      // server-side and the returned URL survives a reload.
      const url = await new Promise<string>((resolve, reject) => {
        const form = new FormData();
        form.append('file', videoFile);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload/video');

        xhr.upload.onprogress = (event) => {
          if (uploadAbortRef.current) {
            xhr.abort();
            return;
          }
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          let payload: { url?: string; error?: string } = {};
          try {
            payload = JSON.parse(xhr.responseText);
          } catch {
            /* non-JSON error body */
          }
          if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
            resolve(payload.url as string);
          } else {
            reject(new Error(payload.error || 'Video yuklashda xatolik yuz berdi'));
          }
        };

        xhr.onerror = () => reject(new Error('Tarmoq xatosi. Qayta urinib ko\u2018ring.'));
        xhr.onabort = () => reject(new Error('__aborted__'));

        xhr.send(form);
      });

      setVideoUrl(url);
      setVideoStoragePath(url);
      setUploadProgress(100);
      toast.success('\u2705 Video muvaffaqiyatli yuklandi!');
      return url;
    } catch (err) {
      if (err instanceof Error && err.message === '__aborted__') {
        toast.info('Yuklash bekor qilindi');
        setUploadProgress(0);
        return null;
      }
      toast.error(err instanceof Error ? err.message : 'Video yuklashda xatolik yuz berdi');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoUrl('');
    setVideoStoragePath('');
    setShowDeleteVideoModal(false);
    toast.success('Video o\'chirildi. O\'zgarishlarni saqlashni unutmang.');
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleId || !title.trim()) {
      toast.error('Modul va dars nomini kiriting');
      return;
    }

    let finalVideoUrl = videoUrl.trim();
    if (finalVideoUrl && !finalVideoUrl.includes('://') && !finalVideoUrl.startsWith('/api/')) {
      finalVideoUrl = 'https://' + finalVideoUrl;
    }
    if (videoSourceType === 'file' && videoFile && !videoUrl) {
      if (videoFile.size > 6 * 1024 * 1024) {
        toast.error('Fayl hajmi 6MB dan katta. Serverless hosting cheklovi sababli YouTube havolasidan foydalaning!');
        return;
      }
      const uploaded = await startVideoUpload();
      if (!uploaded) return;
      finalVideoUrl = uploaded;
    }

    if (!finalVideoUrl) {
      toast.error('Video havolasini kiriting yoki video yuklang');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lesson.id,
          module_id: moduleId,
          title,
          short_description: shortDescription || null,
          description: description || null,
          video_url: finalVideoUrl,
          video_storage_path: videoStoragePath || null,
          duration: durationSeconds,
          order_index: parseInt(orderIndex, 10) || 1,
          xp_reward: parseInt(xpReward, 10) || 100,
          watch_requirement: watchRequirement,
          is_published: isPublished,
          preview_enabled: previewEnabled,
          allow_seeking: allowSeeking,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Darsni saqlashda xatolik');

      setLesson(data.lesson);
      toast.success('Dars muvaffaqiyatli yangilandi!');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Darsni saqlashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lessons?id=${encodeURIComponent(lesson.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O\'chirishda xatolik');

      toast.success('Dars muvaffaqiyatli o\'chirildi');
      router.push('/admin/lessons');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'O\'chirishda xatolik');
    } finally {
      setLoading(false);
      setShowDeleteLessonModal(false);
    }
  };

  // Test question helpers
  const handleAddQuestion = () => {
    const nextIndex = questions.length + 1;
    setQuestions((prev) => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        question: `Savol #${nextIndex}`,
        order_index: nextIndex,
        answers: [
          { id: `ans_${Date.now()}_1`, answer: 'Variant A', is_correct: true },
          { id: `ans_${Date.now()}_2`, answer: 'Variant B', is_correct: false },
          { id: `ans_${Date.now()}_3`, answer: 'Variant C', is_correct: false },
          { id: `ans_${Date.now()}_4`, answer: 'Variant D', is_correct: false },
        ],
      },
    ]);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleSaveTest = async () => {
    if (!testTitle.trim()) {
      toast.error('Test nomini kiriting');
      return;
    }

    if (questions.length === 0) {
      toast.error('Kamida 1 ta savol qo\'shing');
      return;
    }

    setLoading(true);
    try {
      // One call replaces the test and its whole question set atomically,
      // so a half-written test can never reach a student (TZ §22.7).
      const res = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: test?.id,
          lesson_id: lesson.id,
          title: testTitle,
          passing_score: testPassingScore,
          is_published: true,
          questions: questions.map((q) => ({
            question: q.question,
            points: q.points ?? 1,
            multiple: Boolean(q.multiple),
            answers: (q.answers || []).map((a) => ({
              answer: a.answer,
              is_correct: Boolean(a.is_correct),
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Testni saqlashda xatolik');

      setTest(data.test);
      toast.success('Test muvaffaqiyatli saqlandi va darsga biriktirildi!');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Testni saqlashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <Link
          href="/admin/lessons"
          className="text-white/50 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ChevronLeft size={16} /> Darslar ro&apos;yxatiga qaytish
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/lesson/${lesson.id}`}
            target="_blank"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-1.5 transition"
          >
            <Eye size={14} /> Talaba kabi ko&apos;rish (Preview)
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteLessonModal(true)}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 flex items-center gap-1.5 transition"
          >
            <Trash2 size={14} /> Darsni o&apos;chirish
          </button>
        </div>
      </div>

      {/* Tabs: Lesson Editor vs Test Builder */}
      <div className="flex items-center gap-2 p-1 bg-black/40 border border-white/5 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('lesson')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
            activeTab === 'lesson'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Film size={15} /> Dars & Video Sozlamalari
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
            activeTab === 'test'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Award size={15} /> Dars Testi ({questions.length} savol)
        </button>
      </div>

      {activeTab === 'lesson' ? (
        <form onSubmit={handleUpdateLesson} className="space-y-8">
          {/* Section 1: Video Management & Real Device Upload */}
          <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Film size={20} className="text-emerald-400" />
                  1. Dars Videosini Boshqarish
                </h2>
                <p className="text-xs text-white/50 mt-0.5">
                  YouTube / Vimeo / MP4 video havolasi yoki fayl orqali yuklash
                </p>
              </div>

              {/* Video Source Tabs */}
              <div className="inline-flex rounded-2xl bg-black/60 border border-white/10 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setVideoSourceType('url')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    videoSourceType === 'url'
                      ? 'bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>Video Havolasi (URL)</span>
                  <span className="text-[9px] uppercase tracking-wider bg-black/20 text-black px-1.5 py-0.5 rounded font-mono font-bold">
                    Tavsiya
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSourceType('file')}
                  className={`px-4 py-2 rounded-xl font-bold transition ${
                    videoSourceType === 'file'
                      ? 'bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Fayl yuklash (&lt; 6MB)
                </button>
              </div>
            </div>

            {/* Tab 1: Video URL (Telegram Guruh/Kanal, YouTube, MP4) */}
            {videoSourceType === 'url' ? (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-black to-emerald-500/10 border border-pink-500/25 text-xs text-white/80 leading-relaxed space-y-1.5 shadow-md">
                  <p className="font-bold flex items-center gap-1.5 text-pink-400">
                    <Send size={14} /> Telegram Guruh/Kanal yoki Video Havolasi:
                  </p>
                  <p>
                    Dars videosi yuklangan <strong>Telegram yopiq guruhi / kanali havolasini</strong> (masalan: <code>https://t.me/...</code> yoki <code>https://t.me/kanal_nomi/123</code>) yoki to‘g‘ridan-to‘g‘ri video linkini (MP4 / YouTube) kiriting. Talaba darsga kirganda <strong>&quot;Videoni Telegramda Ko‘rish&quot;</strong> tugmasi orqali o‘sha kanal/guruhdagi dars videosini ko‘radi va testni topshiradi!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/70 mb-2 font-bold">
                    Video Havolasi (Telegram Guruh/Kanal havolasi, MP4 yoki video link) *
                  </label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.trim() && !val.includes('://') && (val.includes('t.me') || val.includes('telegram.me') || val.includes('youtube.com') || val.includes('youtu.be') || val.includes('.mp4') || val.includes('vimeo.com'))) {
                        val = 'https://' + val.trim();
                      }
                      setVideoUrl(val);
                    }}
                    placeholder="https://t.me/... yoki https://...mp4 yoki https://www.youtube.com/..."
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3.5 text-white text-sm font-mono focus:outline-none focus:border-pink-500 transition placeholder:text-white/20"
                  />
                </div>

                {/* Video Duration setting */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-mono uppercase text-white/60 mb-1.5 font-bold">
                      Dars davomiyligi (daqiqada)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={Math.round(durationSeconds / 60)}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value, 10) || 1;
                        setDurationSeconds(mins * 60);
                      }}
                      placeholder="Masalan: 15"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                    <span className="text-[11px] text-white/40 font-mono mt-1 block">
                      Jami: {durationSeconds} soniya
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-white/60 mb-1.5 font-bold">
                      Ko&apos;rish talabi (foizda %)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={watchRequirement}
                      onChange={(e) => setWatchRequirement(parseInt(e.target.value, 10) || 90)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                    <span className="text-[11px] text-white/40 font-mono mt-1 block">
                      Talaba testga o&apos;tishi uchun videoni ko&apos;rish minimumi: 90%
                    </span>
                  </div>
                </div>

                {/* Live Preview for YouTube, Telegram or direct URL */}
                {videoUrl && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-mono text-white/60 block font-bold uppercase">
                      Video ko&apos;rinishi (Jonli Preview):
                    </span>
                    <div className="aspect-video w-full max-w-2xl bg-black rounded-2xl overflow-hidden border border-white/15 relative shadow-2xl">
                      {extractYouTubeId(videoUrl) ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}`}
                          title="YouTube Preview"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : /t\.me|telegram\.me/.test(videoUrl) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-br from-pink-950/40 via-black to-[#0c0c14]">
                          <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                            <Send size={24} />
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm font-black text-white font-mono uppercase">Telegram Guruh/Kanal Video Havolasi</div>
                            <div className="text-xs text-white/50 max-w-sm font-mono truncate">{videoUrl}</div>
                          </div>
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-pink-500 text-white font-black text-xs uppercase tracking-wider font-mono hover:bg-pink-600 transition"
                          >
                            Telegramda ochib ko‘rish
                          </a>
                        </div>
                      ) : (
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: File Upload (limited to < 6MB) */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <p>
                    <strong>Netlify cheklovi:</strong> Serverless hosting serverga to&apos;g&apos;ridan-to&apos;g&apos;ri faqat <strong>6 MB gacha</strong> bo&apos;lgan fayllarni yuklashga ruxsat beradi. Katta dars videolari uchun <strong>&quot;Video Havolasi (URL)&quot;</strong> bo&apos;limidan foydalanib, YouTube (Unlisted) havolasini kiritish tavsiya etiladi.
                  </p>
                </div>

                {videoPreviewUrl ? (
                  <div className="space-y-4">
                    <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-white text-sm">
                            {fileMeta?.name || lesson.title}
                          </h4>
                          <p className="text-xs font-mono text-white/40 mt-0.5">
                            Davomiyligi: {Math.floor(durationSeconds / 60)} daq {durationSeconds % 60} soniya
                            {fileMeta && ` • ${fileMeta.sizeMb}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5"
                          >
                            <UploadCloud size={14} /> Videoni almashtirish
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowDeleteVideoModal(true)}
                            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition flex items-center gap-1"
                          >
                            <Trash2 size={14} /> O&apos;chirish
                          </button>
                        </div>
                      </div>

                      {/* Upload Progress */}
                      {isUploading && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60 flex items-center gap-1.5">
                              <RefreshCw size={12} className="animate-spin text-emerald-400" />
                              Yangi video yuklanmoqda...
                            </span>
                            <span className="text-emerald-400 font-bold">{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Video Player Preview */}
                      <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/10 relative">
                        <video
                          src={videoPreviewUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-3xl p-8 sm:p-12 text-center transition cursor-pointer bg-black/30 hover:bg-black/50 flex flex-col items-center justify-center gap-3"
                  >
                    <UploadCloud size={36} className="text-white/30" />
                    <p className="text-sm font-bold text-white">Yangi video fayl yuklang</p>
                    <p className="text-xs text-white/40">MP4, WebM, MOV • Maksimal 6MB</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleVideoSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Section 2: Lesson Information */}
          <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles size={20} className="text-emerald-400" />
              2. Dars Ma&apos;lumotlari va Tavsifi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Tegishli modul *</label>
                <select
                  required
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.courses?.title} ({m.courses?.level}) — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Dars tartib raqami (#)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Dars nomi *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Trading asoslari — Candlestick nima?"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Qisqa tavsif (Short Description)</label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Ushbu darsda candlestick grafiklarining asosiy tushunchalarini o'rganasiz."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">
                To&apos;liq dars tavsifi va qo&apos;llanma (Full Description / Talaba sahifasida ko&apos;rinadi)
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu darsda siz trading nima ekanligi, financial markets qanday ishlashi va treyderning asosiy vazifalarini o'rganasiz..."
                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500 transition resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Video Rules & Settings */}
          <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Clock size={20} className="text-emerald-400" />
              3. Video Qoidalari va Sozlamalari
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">
                  Davomiyligi (Soniya)
                </label>
                <input
                  type="number"
                  min="10"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10) || 600)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">
                  Test ochilishi uchun talab (%)
                </label>
                <select
                  value={watchRequirement}
                  onChange={(e) => setWatchRequirement(parseInt(e.target.value, 10))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value={50}>50% ko&apos;rilgach</option>
                  <option value={70}>70% ko&apos;rilgach</option>
                  <option value={80}>80% ko&apos;rilgach</option>
                  <option value={90}>90% ko&apos;rilgach (Standart)</option>
                  <option value={95}>95% ko&apos;rilgach</option>
                  <option value={100}>100% to&apos;liq ko&apos;rilgach</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">
                  XP Mukofoti
                </label>
                <input
                  type="number"
                  min="0"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
              <label className="flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/20 transition">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-white">E&apos;lon qilingan (Live)</div>
                  <div className="text-[10px] text-white/40">Talabalarga ko&apos;rinadi</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/20 transition">
                <input
                  type="checkbox"
                  checked={previewEnabled}
                  onChange={(e) => setPreviewEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-white">Bepul Preview</div>
                  <div className="text-[10px] text-white/40">Obunasiz ham ko&apos;rish mumkin</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-2xl cursor-pointer hover:border-white/20 transition">
                <input
                  type="checkbox"
                  checked={allowSeeking}
                  onChange={(e) => setAllowSeeking(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-white">Oldinga o&apos;tkazish (Seeking)</div>
                  <div className="text-[10px] text-white/40">Vaqt chizig&apos;ini siljitish ruxsati</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || isUploading}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              O&apos;zgarishlarni Saqlash
            </button>
          </div>
        </form>
      ) : (
        /* Section 4: Attached Test Builder Tab */
        <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Award size={20} className="text-emerald-400" />
                Darsga Biriktirilgan Bilim Testi
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Talaba videoni {watchRequirement}% ko&apos;rgach ushbu test ochiladi. O&apos;tish balli: {testPassingScore}%.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Plus size={16} /> Savol qo&apos;shish
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/40 border border-white/5 rounded-2xl p-5">
            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Test nomi *</label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Masalan: Candlestick bilimlari testi"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">O&apos;tish balli (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={testPassingScore}
                onChange={(e) => setTestPassingScore(parseInt(e.target.value, 10) || 85)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-6 pt-2">
            {questions.map((q, qIndex) => (
              <div key={q.id || qIndex} className="bg-black/50 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
                    Savol #{qIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(qIndex)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Savolni o&apos;chirish
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/60 mb-1">Savol matni *</label>
                  <input
                    type="text"
                    required
                    value={q.question}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions((prev) =>
                        prev.map((item, idx) => (idx === qIndex ? { ...item, question: val } : item))
                      );
                    }}
                    placeholder="Masalan: Support zonasi deganda nimani tushunasiz?"
                    className="w-full bg-black/70 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">
                    Javob variantlari (To&apos;g&apos;ri javobni tanlang):
                  </label>

                  {q.answers?.map((ans, aIndex: number) => (
                    <div key={ans.id || aIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`correct_${qIndex}`}
                        checked={!!ans.is_correct}
                        onChange={() => {
                          setQuestions((prev) =>
                            prev.map((item, idx) => {
                              if (idx !== qIndex) return item;
                              return {
                                ...item,
                                answers: item.answers.map((a, aIdx: number) => ({
                                  ...a,
                                  is_correct: aIdx === aIndex,
                                })),
                              };
                            })
                          );
                        }}
                        className="w-4 h-4 text-emerald-500 focus:ring-0 cursor-pointer"
                        title="To'g'ri javob sifatida belgilash"
                      />

                      <input
                        type="text"
                        required
                        value={ans.answer}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item, idx) => {
                              if (idx !== qIndex) return item;
                              return {
                                ...item,
                                answers: item.answers.map((a, aIdx: number) =>
                                  aIdx === aIndex ? { ...a, answer: val } : a
                                ),
                              };
                            })
                          );
                        }}
                        placeholder={`Variant ${String.fromCharCode(65 + aIndex)}`}
                        className={`flex-1 bg-black/60 border rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none transition ${
                          ans.is_correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleSaveTest}
              disabled={loading}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Testni Saqlash & Biriktirish
            </button>
          </div>
        </div>
      )}

      {/* Delete Lesson Confirmation Modal */}
      {showDeleteLessonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Darsni o&apos;chirishni tasdiqlaysizmi?</h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Bu amal dars ma&apos;lumotlari, talabalarning ko&apos;rish progressi va unga tegishli barcha testlarni bazadan o&apos;chiradi.
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteLessonModal(false)}
                className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleDeleteLesson}
                disabled={loading}
                className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl transition shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Ha, o&apos;chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Video Confirmation Modal */}
      {showDeleteVideoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Film size={28} />
            </div>

            <h3 className="text-lg font-black text-white">Video faylni o&apos;chirish</h3>
            <p className="text-xs text-white/50">
              Ushbu darsning video fayli o&apos;chiriladi. Yangi video yuklashingiz mumkin bo&apos;ladi.
            </p>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteVideoModal(false)}
                className="px-5 py-2.5 bg-white/5 text-white font-bold text-xs rounded-xl hover:bg-white/10"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleDeleteVideo}
                className="px-5 py-2.5 bg-rose-500 text-white font-bold text-xs rounded-xl hover:bg-rose-600"
              >
                O&apos;chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
