'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import type { FaqEntry } from '@/lib/content/faq';

export default function FAQAccordion({ entries }: { entries: FaqEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(entries[0]?.id ?? null);

  if (!entries.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/12 px-6 py-10 text-center text-sm text-white/40">
        Hozircha savollar qo‘shilmagan.
      </p>
    );
  }

  return (
    <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
      {entries.map((entry) => {
        const isOpen = openId === entry.id;

        return (
          <div key={entry.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-${entry.id}`}
              onClick={() => setOpenId(isOpen ? null : entry.id)}
              className="group flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-sm font-bold text-white/90 transition group-hover:text-white sm:text-[15px]">
                {entry.question}
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/12 text-white/50 transition group-hover:border-white/30 group-hover:text-white">
                {isOpen ? <Minus size={14} /> : <Plus size={14} />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-${entry.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 pr-10 text-[13px] leading-relaxed text-white/55">
                    {entry.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
