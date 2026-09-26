'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { Lock, PlayCircle, CheckCircle2, AlertTriangle, Loader2, EyeOff, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

/** The slice of the YouTube IFrame API this player actually uses. */
interface YouTubePlayer {
  getDuration?: () => number;
  getCurrentTime?: () => number;
  destroy?: () => void;
}

interface YouTubePlayerConstructor {
  new (elementId: string, options: {
    videoId: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: () => void;
      onStateChange?: (event: { data: number }) => void;
    };
  }): YouTubePlayer;
}

declare global {
  interface Window {
    YT?: { Player?: YouTubePlayerConstructor };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Lesson video player with watch tracking (TZ §11, §12, §13).
 *
 * - Progress is posted to /api/progress every few seconds and on unload, so a
 *   refresh or a different device resumes where the student left off.
 * - Seeking forward is blocked unless the admin enabled it, otherwise the
 *   watch requirement could be skipped with one drag of the scrubber.
 * - The test button stays locked until the server confirms the threshold; the
 *   server re-checks it again on /api/test/start and /api/test/submit.
 */

interface Props {
  lessonId: string;
  videoUrl: string;
  provider: string;
  duration: number;
  watchRequirement: number;
  allowSeeking: boolean;
  initialWatchedSeconds: number;
  initialPercentage: number;
  testId: string | null;
  testPassed: boolean;
  testScore: number;
  passingScore: number;
  nextLessonId: string | null;
  nextLessonLocked: boolean;
  courseId: string;
  /** Identity burned into the overlay so a leaked recording is traceable. */
  viewerName: string;
  viewerEmail: string;
  viewerId: string;
  telegramChannelUrl?: string;
}

const SAVE_INTERVAL_MS = 5000;

/** Corners the watermark cycles through, so cropping cannot remove it. */
const MARK_POSITIONS = [
  'left-3 top-3',
  'right-3 top-3 text-right',
  'right-3 bottom-16 text-right',
  'left-3 bottom-16',
];

function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

export default function VideoPlayerClient({
  lessonId,
  videoUrl,
  provider,
  duration,
  watchRequirement,
  allowSeeking,
  initialWatchedSeconds,
  initialPercentage,
  testId,
  testPassed,
  testScore,
  passingScore,
  nextLessonId,
  nextLessonLocked,
  courseId,
  viewerName,
  viewerEmail,
  viewerId,
  telegramChannelUrl,
}: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Watermark corner, rotated on a timer so it cannot be cropped out. */
  const [markSpot, setMarkSpot] = useState(0);
  /** True while the tab is hidden or the window is in the background. */
  const [hidden, setHidden] = useState(false);

  const [percentage, setPercentage] = useState(initialPercentage);
  const [unlocked, setUnlocked] = useState(initialPercentage >= watchRequirement);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Highest position actually reached — the value we report to the server.
  const furthestRef = useRef(initialWatchedSeconds);
  const lastSavedRef = useRef(initialWatchedSeconds);
  const durationRef = useRef(duration || 0);

  const save = useCallback(
    async (seconds: number, keepalive = false) => {
      const effectiveDuration = durationRef.current || duration;
      if (!effectiveDuration || seconds <= lastSavedRef.current) return;

      lastSavedRef.current = seconds;
      setSaving(true);

      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            watchedSeconds: Math.round(seconds),
            duration: Math.round(effectiveDuration),
          }),
          keepalive,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || t('lesson.saveFailed'));
          return;
        }

        setError('');
        setPercentage(data.watchPercentage);

        if (data.testUnlocked && !unlocked) {
          setUnlocked(true);
          toast.success('Test ochildi! Endi bilimingizni tekshiring.');
        }
      } catch {
        // Network hiccup: keep playing, the next tick retries (TZ §30).
        setError('Tarmoq xatosi — progress keyinroq saqlanadi');
        lastSavedRef.current = Math.max(0, seconds - 1);
      } finally {
        setSaving(false);
      }
    },
    [duration, lessonId, unlocked]
  );

  // ── Leak deterrence (TZ §12) ───────────────────────────────────────────────
  //
  // A browser cannot block an OS screenshot, a recorder, or a phone camera —
  // no web API exposes them. What it can do is make any capture identify the
  // person who made it, and stop playback the moment the lesson is no longer
  // the thing being looked at, which covers the common "share my screen" case.

  useEffect(() => {
    const timer = setInterval(() => setMarkSpot((spot) => (spot + 1) % 4), 7000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const pause = () => {
      setHidden(true);
      videoRef.current?.pause();
    };
    const resume = () => setHidden(false);

    const onVisibility = () => (document.hidden ? pause() : resume());

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', resume);
    };
  }, []);

  // ── Native video ───────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || provider === 'youtube') return;

    const onLoaded = () => {
      if (video.duration && Number.isFinite(video.duration)) durationRef.current = video.duration;
      // Resume from the saved position.
      if (initialWatchedSeconds > 0 && initialWatchedSeconds < video.duration - 1) {
        video.currentTime = initialWatchedSeconds;
      }
    };

    const onTimeUpdate = () => {
      if (video.currentTime > furthestRef.current) {
        furthestRef.current = video.currentTime;
      }
    };

    // Block forward scrubbing past the furthest point actually watched.
    const onSeeking = () => {
      if (allowSeeking) return;
      if (video.currentTime > furthestRef.current + 1.5) {
        video.currentTime = furthestRef.current;
        toast.info(t('lesson.noSeeking'));
      }
    };

    const onEnded = () => {
      furthestRef.current = durationRef.current;
      void save(durationRef.current);
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('ended', onEnded);
    };
  }, [allowSeeking, initialWatchedSeconds, provider, save]);

  // ── YouTube IFrame API ─────────────────────────────────────────────────────
  useEffect(() => {
    if (provider !== 'youtube') return;

    const videoId = youtubeId(videoUrl);
    if (!videoId) return;

    let player: YouTubePlayer | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      const YT = window.YT;
      if (!YT?.Player) return;

      player = new YT.Player(`yt-player-${lessonId}`, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(initialWatchedSeconds) },
        events: {
          onReady: () => {
            const total = player?.getDuration?.();
            if (total) durationRef.current = total;
          },
          onStateChange: (event: { data: number }) => {
            // 1 === playing
            if (event.data === 1 && !poll) {
              poll = setInterval(() => {
                const current = player?.getCurrentTime?.() ?? 0;
                if (current > furthestRef.current) furthestRef.current = current;
              }, 1000);
            } else if (event.data !== 1 && poll) {
              clearInterval(poll);
              poll = null;
              void save(furthestRef.current);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      const existing = document.getElementById('youtube-iframe-api');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        init();
      };
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      player?.destroy?.();
    };
  }, [initialWatchedSeconds, lessonId, provider, save, videoUrl]);

  // Periodic save + save on leaving the page.
  useEffect(() => {
    const timer = setInterval(() => {
      if (furthestRef.current > lastSavedRef.current) void save(furthestRef.current);
    }, SAVE_INTERVAL_MS);

    const flush = () => {
      if (furthestRef.current > lastSavedRef.current) void save(furthestRef.current, true);
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);

    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      flush();
    };
  }, [save]);

  const isEmbeddable = provider === 'youtube' && youtubeId(videoUrl);
  const isTelegram = provider === 'telegram' || /t\.me|telegram\.me/.test(videoUrl);

  return (
    <div data-protected-notice className="space-y-4">
      {/* Player */}
      <div
        data-protected
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
      >
        {!videoUrl ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/35">
            <PlayCircle size={30} />
            <p className="text-sm font-semibold">{t('lesson.videoNotUploaded')}</p>
          </div>
        ) : isEmbeddable ? (
          <div id={`yt-player-${lessonId}`} className="h-full w-full" />
        ) : isTelegram ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-br from-pink-950/25 via-black to-[#09090e]">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-2xl">
              <Send size={28} />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
                Dars Videosi Telegram Yopiq Guruhida
              </h3>
              <p className="text-xs text-white/60 leading-relaxed font-sans">
                Ushbu dars videosi platformaning yopiq Telegram guruhi / kanalida joylashtirilgan. Videoni ko‘rish uchun quyidagi havola orqali o‘ting:
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  save(duration || 600, false);
                  setPercentage(100);
                  toast.success('Dars videosi ochildi');
                }}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider font-mono shadow-xl transition transform hover:scale-[1.02]"
              >
                <Send size={15} />
                <span>Videoni Telegramda Ko‘rish</span>
              </a>

              {percentage < watchRequirement && (
                <button
                  type="button"
                  onClick={() => {
                    save(duration || 600, false);
                    setPercentage(100);
                    toast.success('Dars ko‘rildi deb belgilandi va test ochildi!');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold transition"
                >
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Videoni ko‘rdim (Testni ochish)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            playsInline
            preload="metadata"
            className="h-full w-full"
          >
            {t('lesson.videoUnsupported')}
          </video>
        )}

        {/* Identity overlay — visible in any screenshot or recording. */}
        {videoUrl && (
          <div
            aria-hidden
            className={`pointer-events-none absolute select-none font-mono text-[10px] leading-tight text-white/25 mix-blend-difference transition-all duration-1000 sm:text-[11px] ${
              MARK_POSITIONS[markSpot]
            }`}
          >
            <span className="block font-bold">{viewerName}</span>
            <span className="block">{viewerEmail}</span>
            <span className="block opacity-70">{viewerId.slice(0, 8)}</span>
          </div>
        )}

        {/* Playback stops whenever the lesson is not the focused window. */}
        {hidden && videoUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/95 text-center backdrop-blur-md">
            <EyeOff size={26} className="text-white/50" />
            <p className="text-sm font-bold text-white">{t('lesson.videoPaused')}</p>
            <p className="max-w-xs px-6 text-xs leading-relaxed text-white/50">
              {t('lesson.videoPausedHint')}
            </p>
          </div>
        )}
      </div>

      {/* Watch progress */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-white/45">
            {t('lesson.watchProgress')}
          </span>
          <span className="flex items-center gap-2 font-mono text-xs font-bold text-white">
            {saving && <Loader2 size={11} className="animate-spin text-white/40" />}
            {percentage}% / {watchRequirement}%
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              unlocked ? 'bg-emerald-400' : 'bg-white'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
            <AlertTriangle size={11} /> {error}
          </p>
        )}
      </div>

      {/* Test gate */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        {!testId ? (
          <p className="text-[13px] text-white/45">
            Bu dars uchun test hali qo‘shilmagan. Darsni ko‘rib chiqing va keyingi darsga o‘ting.
          </p>
        ) : testPassed ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-300">
                <CheckCircle2 size={15} />
                Test topshirildi — {testScore}%
              </p>

              {nextLessonId && !nextLessonLocked ? (
                <Link
                  href={`/lesson/${nextLessonId}`}
                  className="rounded-xl bg-white px-5 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
                >
                  Keyingi dars
                </Link>
              ) : (
                <Link
                  href={`/course/${courseId}`}
                  className="rounded-xl border border-white/15 px-5 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-white transition hover:border-white/35"
                >
                  Kursga qaytish
                </Link>
              )}
            </div>

            {/* Telegram Channel Button for completed test */}
            <div className="p-3.5 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-950/20 via-black to-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                  <Sparkles size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">Yopiq Telegram Kanalga Kirish</div>
                  <div className="text-[10px] text-white/50">Test topshirildi — tahlillar va mentor kanaliga ulaning</div>
                </div>
              </div>
              <a
                href={telegramChannelUrl || 'https://t.me/newera_trading'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[11px] uppercase tracking-wider hover:opacity-95 transition shrink-0"
              >
                <Send size={13} />
                <span>Kanalga Kirish</span>
              </a>
            </div>
          </div>
        ) : unlocked ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-white/60">
              Testni topshiring. O‘tish bali:{' '}
              <span className="font-mono font-bold text-white">{passingScore}%</span>
              {testScore > 0 && <span className="text-white/40"> · oxirgi natija {testScore}%</span>}
            </p>
            <Link
              href={`/test/${testId}`}
              className="rounded-xl bg-white px-6 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
            >
              {testScore > 0 ? 'Qayta topshirish' : 'Testni boshlash'}
            </Link>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-white/45">
            <Lock size={14} className="shrink-0" />
            Testni ochish uchun videoni kamida {watchRequirement}% ko‘ring.
          </p>
        )}
      </div>
    </div>
  );
}
