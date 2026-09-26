'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  Settings, 
  LogOut, 
  HelpCircle, 
  MessageSquare, 
  Layers, 
  PlayCircle, 
  Sparkles, 
  FileCheck, 
  LineChart, 
  Bell,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  Languages,
  Tag
} from 'lucide-react';

interface AdminSidebarProps {
  currentFullName: string;
  currentEmail: string;
}

export default function AdminSidebar({ currentFullName, currentEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Boshqaruv Paneli', href: '/admin', icon: LayoutDashboard },
    { name: 'Narxlar & Tariflar', href: '/admin/pricing', icon: Tag, badge: 'Yangi' },
    { name: 'To\'lovlar & Cheklar', href: '/admin/payments', icon: CreditCard, badge: 'Cheklar' },
    { name: 'Video Darslar', href: '/admin/lessons', icon: PlayCircle, badge: 'Video' },
    { name: 'Kurslar & Modullar', href: '/admin/courses', icon: BookOpen },
    { name: 'Foydalanuvchilar', href: '/admin/users', icon: Users },
    { name: 'Modullar', href: '/admin/modules', icon: Layers },
    { name: 'Testlar Konstruktori', href: '/admin/tests', icon: Sparkles },
    { name: 'Kvitansiyalar Arxiv', href: '/admin/receipts', icon: FileCheck },
    { name: 'Analitika', href: '/admin/analytics', icon: LineChart },
    { name: 'Sharhlar', href: '/admin/reviews', icon: MessageSquare },
    { name: 'FAQ Savollar', href: '/admin/faq', icon: HelpCircle },
    { name: 'Xabarnomalar', href: '/admin/notifications', icon: Bell },
    { name: 'Tarjimalar', href: '/admin/translations', icon: Languages },
    { name: 'Parol tiklash', href: '/admin/password-resets', icon: KeyRound },
    { name: 'Sozlamalar', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-full md:w-72 bg-[#000000] border-r border-white/10 flex flex-col shrink-0 shadow-2xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="NEW ERA"
            className="h-6 w-6 object-contain rounded-md shadow"
          />
          <div className="text-lg font-black text-white tracking-widest font-mono">
            NEW<span className="text-white/40">.</span>ERA
          </div>
        </Link>


        <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-white/10 text-white rounded-full border border-white/20 font-black tracking-wider flex items-center gap-1">
          <ShieldCheck size={11} /> Admin
        </span>
      </div>


      {/* Navigation List */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 group ${
                isActive
                  ? 'bg-white text-black shadow-md translate-x-1 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={16} className={`transition duration-150 ${isActive ? 'text-black' : 'text-white/40 group-hover:text-white'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge ? (
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  isActive ? 'bg-black text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {item.badge}
                </span>
              ) : (
                <ChevronRight size={13} className={`opacity-0 group-hover:opacity-100 transition ${isActive ? 'opacity-100 text-black' : 'text-white/30'}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Switch to User Panel */}
      <div className="p-4 border-t border-white/10 bg-[#080808] space-y-3">
        <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="text-xs font-bold text-white truncate flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {currentFullName}
          </div>
          <div className="text-[11px] text-white/40 font-mono truncate mt-0.5">{currentEmail}</div>
        </div>
        
        <Link 
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl transition border border-white/10 w-full"
        >
          <LogOut size={14} className="rotate-180 text-white" />
          Foydalanuvchi Kabinetiga
        </Link>
      </div>
    </aside>
  );
}
