'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import type { AdminModuleOption } from '@/types/admin';
import { useRouter, useSearchParams } from 'next/navigation';
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
  HardDrive,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

function AdminCreateLessonForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedModuleId = searchParams?.get('moduleId') || '';
  const preSelectedCourseId = searchParams?.get('courseId') || '';

  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<AdminModuleOption[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string; level?: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(preSelectedCourseId || 'all');
  const [loadingModules, setLoadingModules] = useState<boolean>(true);

  // Form Fields
  const [moduleId, setModuleId] = useState(preSelectedModuleId);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('1');
  const [xpReward, setXpReward] = useState('100');

  // Video Settings
  const [videoSourceType, setVideoSourceType] = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoStoragePath, setVideoStoragePath] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(600);
  const [watchRequirement, setWatchRequirement] = useState(90);
  const [isPublished, setIsPublished] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [allowSeeking, setAllowSeeking] = useState(false);

  // Helper for YouTube ID extraction
  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return match ? match[1] : null;
  };

  // Video Upload State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; sizeMb: string; mime: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<boolean>(false);

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      const res = await fetch('/api/admin/modules', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      // Shape kept as { id, title, courses: { title, level } } for the picker.
      const list: AdminModuleOption[] = (data.modules || []).map((m: AdminModuleOption & { courseTitle?: string; level?: string }) => ({
        id: m.id,
        title: m.title,
        course_id: m.course_id,
        courses: { id: m.course_id, title: m.courseTitle, level: m.level },
      }));

      setModules(list);

      // Extract unique courses for filtering
      const courseMap = new Map<string, { id: string; title: string; level?: string }>();
      list.forEach((m) => {
        if (m.course_id && m.courses?.title && !courseMap.has(m.course_id)) {
          courseMap.set(m.course_id, {
            id: m.course_id,
            title: m.courses.title,
            level: m.courses.level || undefined,
          });
        }
      });
      setCourses(Array.from(courseMap.values()));

      if (list.length > 0) {
        if (preSelectedModuleId && list.some((m) => m.id === preSelectedModuleId)) {
          setModuleId(preSelectedModuleId);
        } else if (!moduleId) {
          setModuleId(list[0].id);
        }
      }
    } catch {
      toast.error('Modullar ro‘yxatini yuklab bo‘lmadi');
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, [preSelectedModuleId, preSelectedCourseId]);

  // Handle Video Selection & Metadata Extraction
  const handleVideoSelect = (file: File) => {
    // Validate format
    const validMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validMimes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
      toast.error('Faqat MP4, WebM yoki MOV formatidagi video fayllar qo\'llab-quvvatlanadi.');
      return;
    }

    // Validate size (max 6 MB due to serverless payload limits)
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    if (file.size > 6 * 1024 * 1024) {
      toast.error(`Fayl hajmi ${sizeMb} MB. Serverless hosting cheklovi sababli 6 MB dan katta videolarni to‘g‘ridan-to‘g‘ri yuklab bo‘lmaydi. Iltimos videoni YouTube-ga 'Dostup po ssylke' (Unlisted) qilib yuklab, "Video Havolasi" tabidan foydalaning!`, { duration: 8000 });
      return;
    }

    setVideoFile(file);
    setFileMeta({
      name: file.name,
      sizeMb: `${sizeMb} MB`,
      mime: file.type || 'video/mp4',
    });

    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);

    // Auto-detect duration using hidden video element
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration && !isNaN(tempVideo.duration)) {
        const secs = Math.round(tempVideo.duration);
        setDurationSeconds(secs);
        toast.success(`Video davomiyligi aniqlandi: ${Math.floor(secs / 60)} daqiqa ${secs % 60} soniya`);
      }
    };

    // Auto-fill title if empty
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  // Real device upload with real byte-level progress (TZ §22.6).
  const startVideoUpload = async (): Promise<string | null> => {
    if (!videoFile) return null;

    setIsUploading(true);
    setUploadProgress(0);
    uploadAbortRef.current = false;

    try {
      const url = await new Promise<string>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', videoFile);

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
            reject(new Error(payload.error || 'Video yuklashda xatolik'));
          }
        };

        xhr.onerror = () => reject(new Error('Tarmoq xatosi. Qayta urinib ko\u2018ring.'));
        xhr.onabort = () => reject(new Error('__aborted__'));

        xhr.send(formData);
      });

      setVideoUrl(url);
      setVideoStoragePath(url);
      setUploadProgress(100);
      toast.success('\u2705 Video serverga muvaffaqiyatli saqlandi!');
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

  const handleCancelUpload = () => {
    uploadAbortRef.current = true;
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setFileMeta(null);
    setVideoUrl('');
    setVideoStoragePath('');
    setUploadProgress(0);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleId || !title.trim()) {
      toast.error('Modul va dars nomini kiriting');
      return;
    }

    if (videoSourceType === 'url') {
      if (!videoUrl.trim()) {
        toast.error('Iltimos video havolasini (YouTube yoki MP4 URL) kiriting');
        return;
      }
    } else {
      if (!videoFile && !videoUrl) {
        toast.error('Iltimos video fayl tanlang yoki video URL kiriting');
        return;
      }
    }

    let finalVideoUrl = videoUrl.trim();
    if (finalVideoUrl && !finalVideoUrl.includes('://') && !finalVideoUrl.startsWith('/api/')) {
      finalVideoUrl = 'https://' + finalVideoUrl;
    }
    if (videoSourceType === 'file' && videoFile && !videoUrl) {
      if (videoFile.size > 6 * 1024 * 1024) {
        toast.error('Fayl hajmi 6MB dan katta. Serverless cheklovi sababli YouTube havolasidan foydalaning!');
        return;
      }
      const uploaded = await startVideoUpload();
      if (!uploaded) return;
      finalVideoUrl = uploaded;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          title,
          short_description: shortDescription || null,
          description: description || null,
          video_url: finalVideoUrl || 'https://www.youtube.com/watch?v=0k5G6i4l-4Y',
          duration: durationSeconds,
          order_index: parseInt(orderIndex, 10) || 1,
          xp_reward: parseInt(xpReward, 10) || 100,
          watch_requirement: watchRequirement,
          is_published: isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dars yaratishda xatolik');

      toast.success('Dars muvaffaqiyatli yaratildi!');
      router.push('/admin/lessons');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dars yaratishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <Link
          href="/admin/lessons"
          className="text-white/50 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ChevronLeft size={16} /> Darslar ro&apos;yxatiga qaytish
        </Link>
        <span className="text-xs font-mono text-emerald-400 uppercase font-bold tracking-wider">
          Yangi Professional Dars
        </span>
      </div>

      <form onSubmit={handleCreateLesson} className="space-y-8">
        {/* Section 1: Video Settings & Source Selection */}
        <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Film size={20} className="text-emerald-400" />
                1. Dars Videosini Joylash
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Video havolasi (YouTube / Vimeo / MP4) yoki serverga yuklash
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

              {/* Live Preview for YouTube or direct URL */}
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

              {!videoPreviewUrl ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleVideoSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition cursor-pointer flex flex-col items-center justify-center gap-4 ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-white/10 hover:border-emerald-500/50 bg-black/30 hover:bg-black/50'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <UploadCloud size={32} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white mb-1">
                      Kichik videoni shu yerga tashlang yoki tanlang
                    </p>
                    <p className="text-xs text-white/40">
                      MP4, WebM, MOV (Maksimal hajm: 6MB)
                    </p>
                  </div>

                  <button
                    type="button"
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 mt-2 flex items-center gap-2 pointer-events-none"
                  >
                    <FileVideo size={16} /> + Video Fayl Tanlash
                  </button>

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
              ) : (
                /* Uploaded / Selected Video Preview Card */
                <div className="space-y-4">
                  <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <FileVideo size={24} />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-white text-sm truncate max-w-sm">
                            {fileMeta?.name || 'video_dars.mp4'}
                          </h4>
                          <div className="flex items-center gap-3 text-[11px] text-white/40 font-mono mt-0.5">
                            <span>{fileMeta?.sizeMb}</span>
                            <span>•</span>
                            <span>{Math.floor(durationSeconds / 60)} daq {durationSeconds % 60} soniya</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!videoUrl && !isUploading && (
                          <button
                            type="button"
                            onClick={startVideoUpload}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5"
                          >
                            <UploadCloud size={14} /> Serverga Yuklash
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition flex items-center gap-1"
                        >
                          <X size={14} /> O&apos;chirish
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {isUploading && (
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white/60 flex items-center gap-1.5">
                            <RefreshCw size={12} className="animate-spin text-emerald-400" />
                            Yuklanmoqda...
                          </span>
                          <span className="text-emerald-400 font-bold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleCancelUpload}
                            className="text-xs text-rose-400 hover:underline"
                          >
                            Yuklashni bekor qilish
                          </button>
                        </div>
                      </div>
                    )}

                    {videoUrl && (
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                        <CheckCircle2 size={16} /> Video saqlandi: {videoUrl}
                      </div>
                    )}

                    {/* Embedded HTML5 Video Preview */}
                    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/10 relative">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Lesson Information */}
        <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Sparkles size={20} className="text-emerald-400" />
            2. Dars Ma&apos;lumotlari va Tavsifi
          </h2>

          {/* Module Explainer Banner */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/80 space-y-1.5 leading-relaxed">
            <p className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles size={14} /> Modul nima?
            </p>
            <p>
              <strong>Modul</strong> — bu darslarning bobi (asosiy mavzusi). Masalan: <em>1. Trading nima?</em>, <em>2. MT5</em>, <em>3. Forex asoslari</em>, <em>4. Brokerlar</em> va h.k.
              Quyida darsingiz tegishli bo‘lgan kurs va modulni tanlang:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Course Filter */}
            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5 font-bold">
                1. Kursni tanlang
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  const newCId = e.target.value;
                  setSelectedCourseId(newCId);
                  const available = newCId === 'all'
                    ? modules
                    : modules.filter((m) => m.course_id === newCId);
                  if (available.length > 0) {
                    setModuleId(available[0].id);
                  }
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="all">Barcha kurslar ({modules.length} ta modul)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.level ? `(${c.level})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Module Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase text-white/60 font-bold">
                  2. Tegishli modul (Bob) *
                </label>
                {modules.length === 0 && !loadingModules && (
                  <button
                    type="button"
                    onClick={loadModules}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <RefreshCw size={10} /> Qayta yuklash
                  </button>
                )}
              </div>
              <select
                required
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                disabled={loadingModules}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              >
                {loadingModules ? (
                  <option value="">Modullar yuklanmoqda...</option>
                ) : (selectedCourseId === 'all' ? modules : modules.filter((m) => m.course_id === selectedCourseId)).length === 0 ? (
                  <option value="">Modullar mavjud emas</option>
                ) : (
                  (selectedCourseId === 'all' ? modules : modules.filter((m) => m.course_id === selectedCourseId)).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.courses?.title ? `${m.courses.title} — ` : ''}{m.title}
                    </option>
                  ))
                )}
              </select>
              {modules.length > 0 && (
                <span className="text-[11px] text-white/40 font-mono mt-1 block">
                  Tanlangan: {(selectedCourseId === 'all' ? modules : modules.filter((m) => m.course_id === selectedCourseId)).find(m => m.id === moduleId)?.title || moduleId}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
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
              <span className="text-[10px] text-white/40 block mt-1">
                ≈ {Math.floor(durationSeconds / 60)} daqiqa {durationSeconds % 60} soniya
              </span>
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

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            href="/admin/lessons"
            className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition"
          >
            Bekor qilish
          </Link>
          <button
            type="submit"
            disabled={loading || isUploading}
            className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Darsni Saqlash & Yaratish
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminCreateLessonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060606]" />}>
      <AdminCreateLessonForm />
    </Suspense>
  );
}
