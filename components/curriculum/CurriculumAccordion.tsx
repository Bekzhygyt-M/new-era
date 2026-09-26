'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { CurriculumModule } from '@/lib/content/curriculum';
import { useI18n } from '@/lib/i18n';

/**
 * Full curriculum, rendered with progressive disclosure (TZ §6).
 *
 * Every module and every topic from the specification is present in the DOM —
 * nothing is summarised away. The accordion keeps the page readable instead of
 * turning it into a wall of text.
 */

interface Props {
  modules: CurriculumModule[];
  accent?: 'neutral' | 'pink' | 'purple' | 'gold';
  /** Index of the module expanded on first render. -1 keeps them all closed. */
  defaultOpen?: number;
}

const ACCENTS = {
  neutral: {
    ring: 'border-white/10 hover:border-white/25',
    open: 'border-white/25 bg-white/[0.03]',
    dot: 'bg-white/40',
    text: 'text-white',
  },
  pink: {
    ring: 'border-pink-500/20 hover:border-pink-400/40',
    open: 'border-pink-400/40 bg-pink-500/[0.05]',
    dot: 'bg-pink-400',
    text: 'text-pink-200',
  },
  purple: {
    ring: 'border-purple-500/15 hover:border-purple-400/40',
    open: 'border-purple-400/40 bg-purple-500/[0.05]',
    dot: 'bg-purple-400/70',
    text: 'text-purple-100',
  },
  gold: {
    ring: 'border-amber-400/15 hover:border-amber-300/40',
    open: 'border-amber-300/40 bg-amber-400/[0.05]',
    dot: 'bg-amber-300/70',
    text: 'text-amber-100',
  },
};

export default function CurriculumAccordion({ modules, accent = 'neutral', defaultOpen = 0 }: Props) {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number>(defaultOpen);
  const styles = ACCENTS[accent];

  if (!modules.length) return null;

  return (
    <div className="space-y-2.5">
      {modules.map((module, index) => {
        const isOpen = openIndex === index;
        const panelId = `curriculum-panel-${accent}-${index}`;
        const buttonId = `curriculum-button-${accent}-${index}`;

        return (
          <div
            key={module.title}
            className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
              isOpen ? styles.open : `bg-white/[0.015] ${styles.ring}`
            }`}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5"
            >
              <span className="shrink-0 text-base sm:text-lg" aria-hidden="true">
                {module.number}
              </span>
              <span className="shrink-0 text-lg sm:text-xl" aria-hidden="true">
                {module.emoji}
              </span>

              <span className={`flex-1 text-sm font-bold sm:text-base ${styles.text}`}>
                {module.title}
              </span>

              <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/30 sm:block">
                {module.topics.length} {t('courses.topics')}
              </span>

              <ChevronDown
                size={18}
                className={`shrink-0 text-white/40 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <ul className="grid gap-x-8 gap-y-2.5 border-t border-white/[0.06] px-5 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
                    {module.topics.map((topic) => (
                      <li key={topic} className="flex items-start gap-2.5">
                        <span
                          className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${styles.dot}`}
                          aria-hidden="true"
                        />
                        <span className="text-[13px] leading-relaxed text-white/65">{topic}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
