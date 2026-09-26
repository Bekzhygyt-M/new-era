'use client';

import { useState } from 'react';
import type { LocalNotification } from '@/types/admin';

type AdminNotificationRow = LocalNotification & { recipient?: string };
import { Bell, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AdminNotificationsClientProps {
  initialNotifications: AdminNotificationRow[];
}

export default function AdminNotificationsClient({ initialNotifications }: AdminNotificationsClientProps) {
  const [notifications, setNotifications] = useState<AdminNotificationRow[]>(initialNotifications);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Sarlavha va xabar matnini kiriting');
      return;
    }

    setLoading(true);
    try {
      // One 'all' row, fanned out per-reader by the API (TZ §21).
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, target: 'all' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      toast.success(`${data.recipients} ta foydalanuvchiga bildirishnoma yuborildi!`);
      setTitle('');
      setMessage('');

      const listRes = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (listRes.ok) {
        const listData = await listRes.json();
        setNotifications(listData.notifications || []);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="pb-6 border-b border-white/5">
        <h1 className="text-3xl font-black text-white">Tizim Bildirishnomalari</h1>
        <p className="text-white/50 text-sm">Barcha talabalarga ommaviy xabarnomalar yuborish va xabarlar jurnali.</p>
      </div>

      {/* Broadcast Form */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bell size={18} className="text-emerald-400" />
          Barcha talabalarga yangi xabar yuborish
        </h2>

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Sarlavha *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Yangi kurs yoki dars qo'shildi..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Xabar turi</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="system">Tizim</option>
                <option value="course">Kurs yangiligi</option>
                <option value="announcement">E&apos;lon</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">Xabar matni *</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Barcha foydalanuvchilar qabul qiladigan xabar..."
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Xabarni tarqatish
            </button>
          </div>
        </form>
      </div>

      {/* Recent Dispatches */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-white mb-4">So&apos;nggi bildirishnomalar jurnali</h3>

        <div className="space-y-3">
          {notifications.slice(0, 10).map((n) => (
            <div key={n.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-start justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm">{n.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/40 uppercase font-mono">{n.type}</span>
                </div>
                <p className="text-white/60 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-emerald-400 font-mono mt-1 block">{n.recipient || 'Foydalanuvchi'}</span>
              </div>
              <span className="text-[10px] font-mono text-white/40 flex-shrink-0">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
