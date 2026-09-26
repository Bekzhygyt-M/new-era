'use client';

import { useState } from 'react';
import type { LocalProfile, LocalPayment, LocalCourse } from '@/types/admin';
import Link from 'next/link';
import { 
  User, 
  ChevronLeft, 
  BookOpen, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Percent,
  Shield,
  Sparkles,
  PlusCircle,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUserDetailClientProps {
  initialProfile: LocalProfile;
  initialPayments: LocalPayment[];
  courses: LocalCourse[];
}

export default function AdminUserDetailClient({
  initialProfile,
  initialPayments,
  courses,
}: AdminUserDetailClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [payments, setPayments] = useState(initialPayments);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUserAction = async (action: string, extraData: Record<string, unknown> = {}) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: profile.id,
          ...extraData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Amal bajarilmadi');

      toast.success(data.message);
      if (action === 'toggle_role') {
        setProfile((prev) => ({ ...prev, role: data.newRole }));
      }
      if (action === 'add_xp') {
        setProfile((prev) => ({ ...prev, xp: data.newXp }));
      }
      if (action === 'grant_course') {
        // Refresh payments list
        const updatedRes = await fetch('/api/admin/payments');
        if (updatedRes.ok) {
          const pData = await updatedRes.json();
          setPayments(pData.payments.filter((p: LocalPayment) => p.user_id === profile.id));
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin = profile.role === 'admin';

  return (
    <div className="space-y-8">
      {/* Header Back Navigation */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <Link
          href="/admin/users"
          className="text-white/60 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition"
        >
          <ChevronLeft size={16} /> Foydalanuvchilar ro&apos;yxatiga qaytish
        </Link>
        <span className="text-xs font-mono text-white/40">USER ID: {profile.id}</span>
      </div>

      {/* User Header Profile Card */}
      <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center font-black text-2xl shadow-xl">
            {profile.full_name?.charAt(0) || <User size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-white">{profile.full_name || 'Ismsiz foydalanuvchi'}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                isAdmin ? 'bg-white text-black' : 'bg-white/10 text-white border border-white/15'
              }`}>
                {profile.role}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-white/50">
              <span>{profile.email}</span>
              {profile.phone && <span>{profile.phone}</span>}
              <span>A&apos;zo bo&apos;lgan: {new Date(profile.created_at).toLocaleDateString('uz-UZ')}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center min-w-[90px]">
            <span className="text-[10px] font-mono text-white/40 uppercase block">Daraja</span>
            <span className="text-sm font-black text-white font-mono">{profile.level || 'Beginner'}</span>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center min-w-[90px]">
            <span className="text-[10px] font-mono text-white/40 uppercase block">XP Ball</span>
            <span className="text-sm font-black text-white font-mono">{profile.xp || 0}</span>
          </div>

          <button
            onClick={() => handleUserAction('toggle_role')}
            disabled={isProcessing}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-mono font-bold border border-white/15 transition flex items-center gap-1.5"
          >
            <Shield size={14} />
            {isAdmin ? 'Studentga o\'tkazish' : 'Admin qilish'}
          </button>

          <button
            onClick={() => handleUserAction('add_xp', { xp: 500 })}
            disabled={isProcessing}
            className="px-4 py-3 bg-white text-black hover:bg-neutral-200 rounded-2xl text-xs font-mono font-black transition flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            +500 XP
          </button>
        </div>
      </div>

      {/* Course Granting Box */}
      <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <PlusCircle size={18} className="text-white" />
          Foydalanuvchiga Kurs Ochib Berish (Manual Grant)
        </h3>
        <p className="text-xs text-white/50">
          Admin orqali to‘lovsiz yoki maxsus kelishuv asosida foydalanuvchiga to‘liq kurs kirish ruxsatini berish.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white/[0.02] border border-white/10 hover:border-white/30 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition"
            >
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-white/40 block mb-1">
                  {course.level} TARIF
                </span>
                <h4 className="text-sm font-black text-white">{course.title}</h4>
                <p className="text-xs font-mono text-white/60 mt-1">
                  {new Intl.NumberFormat('uz-UZ').format(course.price)} {course.currency}
                </p>
              </div>

              <button
                onClick={() => handleUserAction('grant_course', { courseId: course.id })}
                disabled={isProcessing}
                className="w-full py-2 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1"
              >
                <CheckCircle2 size={13} /> Ochib berish
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Payments History */}
      <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <CreditCard size={18} className="text-white" />
          To&apos;lovlar tarixi ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-white/40 py-6 text-center">To&apos;lovlar mavjud emas.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-white block">{p.order_id || p.id.slice(0, 8)}</span>
                  <span className="text-white/40">{new Date(p.created_at).toLocaleDateString('uz-UZ')} • {p.provider?.toUpperCase()} • {p.courses?.title || 'Kurs'}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white block font-mono">
                    {new Intl.NumberFormat('uz-UZ').format(p.amount)} {p.currency}
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white inline-block mt-1">
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
