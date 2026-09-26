'use client';

import { useState, useEffect, useRef } from 'react';
import type { CurrentUser } from '@/types/admin';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, ChevronDown, User, LogOut, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useI18n, Locale } from '@/lib/i18n';

const languages: { code: Locale; label: string }[] = [
  { code: 'uz', label: "O'zbek" },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

export default function Navbar() {
  const { locale, setLocale, t } = useI18n();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const scrolledRef = useRef(false);

  const navLinks = [
    { label: t('nav.home') || 'Bosh sahifa', href: '/' },
    { label: t('nav.courses') || 'Kurslar', href: '/courses' },
    { label: t('nav.about') || 'Biz haqimizda', href: '/about' },
    { label: t('nav.reviews') || 'Sharhlar', href: '/reviews' },
    { label: t('nav.faq') || 'FAQ', href: '/faq' },
  ];

  // /api/auth/me is the single source of truth: it re-reads the role from the
  // database behind the signed session cookie (TZ §9, §29).
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      setCurrentUser(data?.authenticated && data?.user ? data.user : null);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    checkAuth();

    // Re-check on focus so a login/logout in another tab is reflected here.
    window.addEventListener('focus', checkAuth);
    return () => window.removeEventListener('focus', checkAuth);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldScroll = window.scrollY > 20;
          if (shouldScroll !== scrolledRef.current) {
            scrolledRef.current = shouldScroll;
            setIsScrolled(shouldScroll);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-lang-dropdown]')) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    window.location.href = '/login';
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? 'bg-[#080808]/95 backdrop-blur-xl border-b border-white/[0.08]'
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
            <img
              src="/logo.png"
              alt="NEW ERA"
              className="h-8 w-8 object-contain rounded-lg shadow-md group-hover:scale-105 transition-transform duration-200"
            />
            <span className="text-[19px] font-black tracking-[0.16em] text-white uppercase font-mono group-hover:text-neutral-200 transition">
              NEW<span className="text-white/40">.</span>ERA
            </span>
          </Link>


          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-[13px] font-medium text-white/70 hover:text-white rounded-lg transition-colors hover:bg-white/[0.04]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right section: Language + Auth State */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language dropdown */}
            <div className="relative" data-lang-dropdown>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/10 transition-all"
                aria-expanded={langOpen}
                aria-haspopup="listbox"
              >
                <Globe size={14} className="text-white/60" />
                <span className="uppercase font-mono text-[11px] font-bold">{locale}</span>
                <ChevronDown size={12} className={`transition-transform duration-150 ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-1.5 w-32 bg-[#111111] border border-white/15 rounded-xl shadow-2xl overflow-hidden py-1 z-50 backdrop-blur-xl"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLocale(lang.code);
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-[13px] flex items-center justify-between transition-colors ${
                          locale === lang.code
                            ? 'text-black bg-white font-bold'
                            : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{lang.label}</span>
                        {locale === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dynamic User Auth State */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
                {currentUser.isAdmin ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-black hover:bg-neutral-200 transition-all uppercase tracking-wider font-mono shadow-xl border border-white"
                  >
                    <ShieldCheck size={14} />
                    <span>Admin Panel</span>
                  </Link>
                ) : (
                  <Link
                    href="/courses/my"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    <BookOpen size={14} />
                    <span>{t('nav.myCourses')}</span>
                  </Link>
                )}

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[13px] font-bold transition-all border border-white/15 shadow-md"
                >
                  <User size={14} />
                  <span>{t('nav.cabinet')}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                  title={t('nav.logout') || 'Chiqish'}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white/80 hover:text-white transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 rounded-lg bg-white text-black text-[13px] font-bold hover:bg-neutral-200 transition-all tracking-wide shadow-md"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/10 transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menyuni ochish"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 pt-16 bg-[#080808]/98 backdrop-blur-2xl lg:hidden flex flex-col"
          >
            <div className="flex flex-col px-6 pt-6 pb-8 gap-1 flex-1 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-left text-[17px] font-semibold text-white/80 hover:text-white py-3 border-b border-white/[0.06] transition-colors"
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-6 flex flex-col gap-4">
                {/* Languages in Mobile */}
                <div className="flex gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLocale(lang.code)}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-all ${
                        locale === lang.code
                          ? 'border-white text-black bg-white'
                          : 'border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                {/* Mobile Auth Buttons */}
                <div className="flex flex-col gap-2.5 pt-4 border-t border-white/10">
                  {currentUser ? (
                    <>
                      <div className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 mb-2">
                        <div className="text-sm font-bold text-white flex items-center justify-between">
                          <span>{currentUser.full_name || 'Foydalanuvchi'}</span>
                          <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${
                            currentUser.isAdmin ? 'bg-white text-black' : 'bg-white/10 text-white'
                          }`}>
                            {currentUser.isAdmin ? 'ADMIN' : 'STUDENT'}
                          </span>
                        </div>
                        <div className="text-xs text-white/40 font-mono mt-0.5">{currentUser.email}</div>
                      </div>

                      {currentUser.isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setMobileOpen(false)}
                          className="w-full py-3.5 rounded-xl bg-white text-black font-black text-center text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl font-mono"
                        >
                          <ShieldCheck size={16} /> {t('admin.panel') || 'Admin Panel'}
                        </Link>
                      )}

                      <Link
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-center text-[14px] font-bold text-white flex items-center justify-center gap-2"
                      >
                        <User size={16} /> {t('nav.personalCabinet')}
                      </Link>

                      <button
                        onClick={() => {
                          setMobileOpen(false);
                          handleLogout();
                        }}
                        className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-center text-xs font-bold flex items-center justify-center gap-2 transition font-mono"
                      >
                        <LogOut size={14} /> {t('nav.logout') || 'Chiqish'}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="w-full py-3 rounded-xl border border-white/15 text-center text-[14px] font-bold text-white hover:bg-white/[0.05] transition"
                      >
                        {t('nav.login')}
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileOpen(false)}
                        className="w-full py-3.5 rounded-xl bg-white text-black font-black text-center text-[14px] transition shadow-lg"
                      >
                        {t('nav.register')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}



