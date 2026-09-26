'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * Mandatory risk disclaimer consent (TZ §8.1).
 *
 * Registration cannot complete until the box is ticked. The full text opens in
 * a modal; the acceptance itself (version + timestamp) is recorded server-side
 * by the register action, not here.
 */

interface Disclaimer {
  version: string;
  summary_points: string[];
  content: string;
}

export default function RiskDisclaimerConsent({
  accepted,
  onChange,
  error,
}: {
  accepted: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}) {
  const { t } = useI18n();

  const fallback: Disclaimer = {
    version: '1.0',
    summary_points: [
      t('disclaimer.fallback1'),
      t('disclaimer.fallback2'),
      t('disclaimer.fallback3'),
      t('disclaimer.fallback4'),
    ],
    content: '',
  };

  const [disclaimer, setDisclaimer] = useState<Disclaimer>(fallback);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    fetch('/api/disclaimer')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.summary_points?.length) setDisclaimer(data);
      })
      .catch(() => {
        // Fallback text keeps the consent meaningful even if the fetch fails.
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0 text-amber-300" />
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
            {t('disclaimer.badgeVersion', { v: disclaimer.version })}
          </span>
        </div>

        <ul className="space-y-1.5">
          {disclaimer.summary_points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-[12px] leading-relaxed text-white/65">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amber-300/60" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200 underline underline-offset-4 transition hover:text-amber-100 disabled:opacity-50"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          {t('disclaimer.fullDisclaimer')}
        </button>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          required
          aria-describedby={error ? 'disclaimer-error' : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/25 bg-transparent accent-white"
        />
        <span className="text-[12.5px] font-semibold leading-relaxed text-white/75">
          {t('disclaimer.iAgree')}
        </span>
      </label>

      {error && (
        <p id="disclaimer-error" className="text-xs font-medium text-red-400">
          {error}
        </p>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
                onClick={() => setOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-label={t('disclaimer.fullDisclaimer')}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#0b0b0b] sm:rounded-3xl"
                >
                  <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      {t('disclaimer.modalTitle', { v: disclaimer.version })}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label={t('disclaimer.close')}
                      className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-white/70">
                      {disclaimer.content || disclaimer.summary_points.join('\n')}
                    </pre>
                  </div>

                  <footer className="border-t border-white/10 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(true);
                        setOpen(false);
                      }}
                      className="w-full rounded-xl bg-white py-3.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-white/90"
                    >
                      {t('disclaimer.iAgree')}
                    </button>
                  </footer>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
