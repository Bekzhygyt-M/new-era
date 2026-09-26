'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { 
  Home, 
  Compass, 
  PlaySquare, 
  CheckSquare, 
  BookMarked, 
  LineChart, 
  Target, 
  Building2, 
  Trophy, 
  BarChart2, 
  MessageSquare, 
  Settings, 
  HelpCircle,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  Zap
} from 'lucide-react';


interface UserSidebarProps {
  currentFullName?: string;
  currentEmail?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export default function UserSidebar({ 
  currentFullName = 'Xumoyun', 
  currentEmail = 'student@newera.uz',
  activeTab = 'home',
  onTabChange
}: UserSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { id: 'home', name: t('dashboard.navHome'), href: '/dashboard', icon: Home },
    { id: 'roadmap', name: t('dashboard.navRoadmap'), href: '/dashboard?tab=roadmap', icon: Compass },
    { id: 'lessons', name: t('dashboard.navLessons'), href: '/courses', icon: PlaySquare },
    { id: 'tests', name: t('dashboard.navTests'), href: '/dashboard?tab=tests', icon: CheckSquare },
    { id: 'journal', name: t('dashboard.navJournal'), href: '/journal', icon: BookMarked },
    { id: 'backtest', name: t('dashboard.navBacktest'), href: '/backtest', icon: LineChart },
    { id: 'strategies', name: t('dashboard.navStrategies'), href: '/strategies', icon: Target },
    { id: 'brokers', name: t('dashboard.navBrokers'), href: '/brokers', icon: Building2 },
    { id: 'prop-challenge', name: t('dashboard.navPropChallenge'), href: '/prop-challenge', icon: Trophy },
    { id: 'statistics', name: t('dashboard.navStatistics'), href: '/statistics', icon: BarChart2 },
    { id: 'messages', name: t('dashboard.navMessages'), href: '/messages', icon: MessageSquare },
    { id: 'settings', name: t('dashboard.navSettings'), href: '/settings', icon: Settings },
    { id: 'support', name: t('dashboard.navSupport'), href: '/support', icon: HelpCircle },
  ];

  const handleItemClick = (item: typeof navItems[0]) => {
    if (onTabChange) {
      onTabChange(item.id);
    }
  };

  return (
    <aside className="w-full md:w-64 bg-[#000000] border-r border-white/10 flex flex-col shrink-0 min-h-screen text-white/70 select-none shadow-2xl">
      {/* Brand Header with Back Arrow to Main Navbar */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            title={t('dashboard.backToSiteTitle')}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 transition flex items-center justify-center shadow-md group"
          >
            <ChevronLeft size={18} className="transition group-hover:-translate-x-0.5" />
          </Link>

          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="NEW ERA"
              className="h-6 w-6 object-contain rounded-md shadow"
            />
            <div className="text-base sm:text-lg font-black text-white tracking-widest font-mono">
              NEW<span className="text-white/40">.</span>ERA
            </div>
          </Link>



        </div>

        <Link
          href="/"
          className="text-[10px] uppercase font-mono px-2 py-1 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white rounded-lg border border-white/10 transition font-bold"
        >
          {t('dashboard.site')}
        </Link>
      </div>


      {/* Navigation List */}
      <nav className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = 
            (item.id === activeTab && pathname === '/dashboard') ||
            (item.href !== '/dashboard' && !item.href.includes('tab=') && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => handleItemClick(item)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group ${
                isActive
                  ? 'bg-white text-black shadow-lg translate-x-1 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon 
                  size={16} 
                  className={`transition-colors ${
                    isActive ? 'text-black' : 'text-white/40 group-hover:text-white'
                  }`} 
                />
                <span>{item.name}</span>
              </div>

              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pro Upgrade Card (Bottom Banner) */}
      <div className="p-3.5 mt-auto border-t border-white/10 bg-[#050505]">
        <div className="rounded-2xl p-4 bg-[#0a0a0a] border border-white/15 relative overflow-hidden shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-white leading-tight">
              {t('dashboard.upgradeTitle')}
            </h4>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
          
          <p className="text-[11px] text-white/50 leading-snug">
            {t('dashboard.upgradeDesc')}
          </p>

          <Link
            href="/checkout/22222222-2222-2222-2222-222222222222"
            className="w-full py-2 px-3 bg-white hover:bg-neutral-200 text-black font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg uppercase tracking-wider"
          >
            <Sparkles size={13} className="text-black" />
            <span>{t('dashboard.upgradeCta')}</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
