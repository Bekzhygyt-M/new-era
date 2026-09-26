'use client';

import Link from 'next/link';
import { MessageSquare, Instagram, Mail, HelpCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function DashboardFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-12 pt-6 pb-8 border-t border-white/10 text-xs text-white/50 font-sans">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Support contacts */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-white font-bold">
            <div className="w-7 h-7 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <HelpCircle size={15} />
            </div>
            <span>{t('dashboardFooter.askQuestion')}</span>
          </div>

          <Link href="/messages" className="flex items-center gap-1.5 hover:text-white transition font-mono">
            <MessageSquare size={13} />
            <span>{t('dashboardFooter.messages')}</span>
          </Link>

          <a
            href="https://instagram.com/newera_support"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition font-mono"
          >
            <Instagram size={13} />
            <span>@newera_support</span>
          </a>

          <a href="mailto:support@newera.uz" className="flex items-center gap-1.5 hover:text-white transition font-mono">
            <Mail size={13} />
            <span>{t('dashboardFooter.email')}: support@newera.uz</span>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-[11px] text-white/40 font-mono text-center md:text-right">
          {t('dashboardFooter.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
