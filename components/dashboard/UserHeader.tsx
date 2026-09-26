'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Moon, 
  Sun, 
  Bell, 
  User, 
  LogOut, 
  Shield, 
  ChevronDown,
  ChevronLeft
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';


interface UserHeaderProps {
  onSearch?: (query: string) => void;
}

interface HeaderUser {
  full_name: string;
  email: string;
  level: string;
  avatar_url: string | null;
  isAdmin: boolean;
}

/**
 * Dashboard header.
 *
 * The signed-in user is fetched here rather than passed in: every page that
 * renders this header did so without props, which meant a hard-coded stand-in
 * name was shown to everyone. Until the fetch resolves nothing personal is
 * rendered — an invented placeholder is worse than an empty slot.
 */
interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export default function UserHeader({ onSearch }: UserHeaderProps) {
  const { t } = useI18n();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [searchVal, setSearchVal] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.authenticated) setUser(data.user);
      })
      .catch(() => {});

    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.notifications) {
          setNotifications(data.notifications.slice(0, 5));
          setUnreadCount(data.unread ?? data.notifications.filter((n: HeaderNotification) => !n.read).length);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = user?.full_name || '';
  const email = user?.email || '';
  const level = user?.level || '';
  const avatarUrl = user?.avatar_url;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header className="h-16 bg-[#000000] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md">
      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={15} />
        <input
          type="text"
          value={searchVal}
          onChange={handleSearchChange}
          placeholder={t('dashboard.searchPlaceholder')}
          className="w-full bg-[#080808] border border-white/15 focus:border-white rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none transition-all font-mono"
        />
      </div>

      {/* Header Right Tools */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Return to Main Website Link */}
        <Link
          href="/"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 text-xs font-mono font-bold transition shadow"
          title="Asosiy sahifaga qaytish"
        >
          <ChevronLeft size={14} />
          <span>{t('dashboard.mainSite')}</span>
        </Link>

        {/* Theme Switcher Button */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition border border-transparent hover:border-white/15"

          title="Mavzuni almashtirish"
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} className="text-white" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition border border-transparent hover:border-white/15 relative"
            title="Xabarnomalar"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white font-mono text-[9px] font-black flex items-center justify-center ring-2 ring-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0a0a0a] border border-white/20 rounded-2xl p-4 shadow-2xl z-50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Xabarnomalar</h4>
                <span className="text-[10px] font-mono text-white/50">
                  {unreadCount > 0 ? `${unreadCount} ta o‘qilmagan` : 'Barchasi o‘qilgan'}
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-white/40 text-[11px] text-center py-5 font-mono">
                    Hozircha xabarnomalar yo‘q
                  </p>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || '/notifications'}
                      onClick={() => setShowNotifications(false)}
                      className={`block p-2.5 rounded-xl border transition ${
                        !n.read
                          ? 'bg-pink-500/[0.08] border-pink-500/25 hover:border-pink-500/40 text-white'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-white/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-[11px] text-white flex items-center gap-1.5 truncate">
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />}
                          <span className="truncate">{n.title}</span>
                        </div>
                        <span className="text-[9px] font-mono text-white/40 shrink-0">
                          {new Date(n.created_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>
              <div className="pt-2 border-t border-white/10 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-mono font-bold text-pink-400 hover:text-pink-300 transition"
                >
                  Barcha xabarnomalarni ko‘rish →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Chip */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-[#080808] hover:bg-white/10 border border-white/15 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-white text-black font-black flex items-center justify-center text-xs overflow-hidden shadow font-mono">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (fullName.charAt(0) || '·').toUpperCase()
              )}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{fullName || t('dashboard.guest')}</span>
                <ChevronDown size={12} className="text-white/40" />
              </div>
              <span className="text-[10px] font-mono text-white/60 font-semibold uppercase">
                {level}
              </span>
            </div>
          </button>

          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0a0a0a] border border-white/20 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
              <div className="px-3 py-2 border-b border-white/10">
                <div className="text-xs font-bold text-white">{fullName || t('dashboard.guest')}</div>
                <div className="text-[10px] text-white/40 font-mono truncate">{email}</div>
              </div>

              <Link
                href="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition font-medium"
              >
                <User size={14} /> {t('dashboard.profileSettings')}
              </Link>

              {user?.isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/20 rounded-xl transition font-black font-mono"
                >
                  <Shield size={14} /> {t('dashboard.adminPanel')}
                </Link>
              )}

              <button
                type="button"
                onClick={async () => {
                  // The session cookie is httpOnly — only the server can clear it.
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } finally {
                    window.location.href = '/login';
                  }
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <LogOut size={14} /> {t('dashboard.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
