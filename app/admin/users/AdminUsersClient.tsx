'use client';

import { useState } from 'react';
import type { LocalProfile } from '@/types/admin';
import Link from 'next/link';
import { Search, Shield, GraduationCap, Clock, User, ArrowRight, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUsersClientProps {
  initialUsers: LocalProfile[];
}

export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const [users, setUsers] = useState<LocalProfile[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingUser, setDeletingUser] = useState<LocalProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_user',
          userId: deletingUser.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘chirishda xatolik yuz berdi');

      toast.success(data.message || 'Foydalanuvchi o‘chirildi');
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id && u.email !== deletingUser.email));
      setDeletingUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetAllUsers = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_all_users',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tozalashda xatolik yuz berdi');

      toast.success(data.message || 'Barcha foydalanuvchilar tozalandi!');
      setUsers((prev) => prev.filter((u) => u.email?.toLowerCase() === 'admin@gmail.com'));
      setShowResetModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.id?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Foydalanuvchilar ({users.length})</h1>
          <p className="text-white/50 text-sm mt-1">Platformadagi barcha foydalanuvchilar, ro‘llar va hisob boshqaruvi.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ism, email yoki ID..."
              className="w-full bg-[#000000] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors font-mono"
            />
          </div>

          {users.length > 1 && (
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 whitespace-nowrap"
              title="Barcha o'quvchilarni o'chirib, faqat Bosh Adminni qoldirish"
            >
              <Trash2 size={14} />
              Faqat Adminni Qoldirish
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/70">
            <thead className="text-[11px] text-white/40 uppercase font-mono bg-white/[0.03] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Foydalanuvchi & ID</th>
                <th className="px-6 py-4 font-bold">Rol</th>
                <th className="px-6 py-4 font-bold">Daraja & XP</th>
                <th className="px-6 py-4 font-bold">Ro&apos;yxat sanasi</th>
                <th className="px-6 py-4 text-right font-bold">Boshqaruv & O‘chirish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredUsers.map((u) => {
                const shortId = `USR-${u.id.substring(0, 8).toUpperCase()}`;
                const isMasterAdmin = u.email?.toLowerCase() === 'admin@gmail.com';

                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-black text-sm shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || <User size={16} />}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:underline">{u.full_name || 'Ismsiz'}</div>
                          <div className="text-[11px] text-white/40 font-mono">{u.email}</div>
                          <div className="text-[10px] text-white/30 font-mono mt-0.5 font-bold">ID: {shortId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isMasterAdmin 
                          ? 'bg-white text-black font-black' 
                          : 'bg-white/10 text-white/70 border border-white/10'
                      }`}>
                        {isMasterAdmin ? <ShieldCheck size={11} /> : null}
                        {isMasterAdmin ? 'ADMIN' : 'STUDENT'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-bold text-xs flex items-center gap-1.5">
                          <GraduationCap size={13} className="text-white/60" />
                          {u.level || 'Beginner'}
                        </span>
                        <span className="text-[11px] text-white/40 font-mono font-bold">{u.xp || 0} XP</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-white/50">
                      <div className="flex items-center gap-1.5" suppressHydrationWarning>
                        <Clock size={13} />
                        {(u.created_at || '').slice(0, 10)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/admin/users/${u.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white text-white hover:text-black rounded-lg transition-all text-xs font-bold border border-white/10"
                        >
                          Profil <ArrowRight size={12} />
                        </Link>

                        {!isMasterAdmin && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition border border-white/10"
                            title="Akkauntni butunlay o‘chirish"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40 font-mono">
                    Foydalanuvchilar topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-2">
              <AlertTriangle size={22} />
            </div>

            <h3 className="text-lg font-black text-white">Akkauntni o‘chirmoqchimisiz?</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Foydalanuvchi: <strong className="text-white">{deletingUser.full_name} ({deletingUser.email})</strong>.
              <br />
              Ushbu akkaunt, unga tegishli to‘lovlar va kurslar bazadan butunlay o‘chiriladi.
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs text-white/60 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition disabled:opacity-50 flex items-center gap-1.5 shadow-xl"
              >
                <Trash2 size={14} />
                {isDeleting ? 'O‘chirilmoqda...' : 'Ha, o‘chirish'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset All Users Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
              <AlertTriangle size={22} />
            </div>

            <h3 className="text-lg font-black text-white">Barcha foydalanuvchilarni o‘chirish</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Barcha o‘quvchilar akkauntlari (jumladan barcha ortiqcha hisoblar) bazadan butunlay o‘chiriladi va <strong>faqat Bosh Admin (admin@gmail.com)</strong> qoldiriladi.
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs text-white/60 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleResetAllUsers}
                disabled={isResetting}
                className="px-5 py-2.5 bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-1.5 shadow-xl"
              >
                <Trash2 size={14} />
                {isResetting ? 'Tozalanmoqda...' : 'Ha, hammasini tozalash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
