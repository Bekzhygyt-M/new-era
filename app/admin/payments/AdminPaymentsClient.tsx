'use client';

import { useState, useEffect } from 'react';
import type { LocalPayment } from '@/types/admin';
import { 
  Search, 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Check, 
  X, 
  Phone, 
  User, 
  Calendar, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  Plus, 
  Download,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type PaymentStatusFilter =
  | 'all'
  | 'receipt_submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

interface AdminPaymentsClientProps {
  initialPayments: LocalPayment[];
}

export default function AdminPaymentsClient({ initialPayments }: AdminPaymentsClientProps) {
  const [payments, setPayments] = useState<LocalPayment[]>(initialPayments);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Selected payment for Receipt Viewer Modal
  const [selectedPayment, setSelectedPayment] = useState<LocalPayment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Manual Add Payment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('+998 ');
  const [manualCourse, setManualCourse] = useState('22222222-2222-2222-2222-222222222222');
  const [manualAmount, setManualAmount] = useState('279000');
  const [manualProvider, setManualProvider] = useState('click');
  const [manualStatus, setManualStatus] = useState<'approved' | 'receipt_submitted'>('approved');
  const [manualComment, setManualComment] = useState('');

  // Fetch latest payments
  const fetchPayments = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) {
        const data = await res.json();
        if (data.payments) {
          setPayments(data.payments);
          if (showToast) toast.success('To\'lovlar ro\'yxati yangilandi');
        }
      }
    } catch (e) {
      console.warn('Polling payments error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-polling every 6 seconds to catch newly submitted receipts
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPayments(false);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Filter logic
  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'receipt_submitted' 
        ? p.status === 'receipt_submitted'
        : p.status === statusFilter;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesOrder = p.order_id?.toLowerCase().includes(query) || p.id?.toLowerCase().includes(query);
    const matchesUser = p.profiles?.full_name?.toLowerCase().includes(query) || p.profiles?.email?.toLowerCase().includes(query);
    const matchesPhone = p.phone?.includes(query);
    const matchesCourse = p.courses?.title?.toLowerCase().includes(query);
    const matchesName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(query);

    return matchesStatus && (matchesOrder || matchesUser || matchesPhone || matchesCourse || matchesName);
  });

  // Calculate statistics
  const pendingVerificationCount = payments.filter((p) => p.status === 'receipt_submitted').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const approvedCount = payments.filter((p) => p.status === 'approved').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;
  const totalRevenue = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Approve action
  const handleApprove = async (paymentId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      toast.success('To\'lov tasdiqlandi va kurs ochildi!');
      
      // Update local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId || p.order_id === paymentId ? { ...p, status: 'approved', approved_at: new Date().toISOString() } : p
        )
      );

      if (selectedPayment?.id === paymentId || selectedPayment?.order_id === paymentId) {
        setSelectedPayment((prev) => (prev ? { ...prev, status: 'approved' } : prev));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject action
  const handleReject = async (paymentId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Iltimos, rad etish sababini kiriting');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      toast.success('To\'lov rad etildi');

      // Update local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId || p.order_id === paymentId ? { ...p, status: 'rejected', rejection_reason: rejectReason } : p
        )
      );

      if (selectedPayment?.id === paymentId || selectedPayment?.order_id === paymentId) {
        setSelectedPayment((prev) => (prev ? { ...prev, status: 'rejected', rejection_reason: rejectReason } : prev));
      }
      setShowRejectInput(false);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Add Payment Submit
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      toast.error('Ism va familiyani kiriting');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: manualCourse,
          amount: Number(manualAmount) || (manualCourse.includes('2222') ? 499000 : 299000),
          provider: manualProvider,
          firstName: manualName.split(' ')[0] || 'Treyder',
          lastName: manualName.split(' ').slice(1).join(' ') || '',
          phone: manualPhone,
          status: manualStatus,
          comment: manualComment || 'Admin tomonidan qo‘lda yaratildi',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Qo‘shishda xatolik');

      toast.success('To\'lov muvaffaqiyatli qo\'shildi!');
      setShowAddModal(false);
      fetchPayments(false);
      setManualName('');
      setManualComment('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Order ID', 'Payer Name', 'Phone', 'Course', 'Amount', 'Currency', 'Provider', 'Status', 'Date'];
      const rows = filteredPayments.map((p) => [
        p.order_id || p.id,
        `"${p.first_name || ''} ${p.last_name || ''}"`,
        p.phone || '',
        `"${p.courses?.title || 'Course'}"`,
        p.amount || 0,
        p.currency || 'UZS',
        p.provider || '',
        p.status || '',
        new Date(p.created_at).toISOString(),
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `newera_payments_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV fayl yuklab olindi');
    } catch (e) {
      toast.error('Eksportda xatolik yuz berdi');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white text-black">Tasdiqlangan</span>;
      case 'receipt_submitted':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/20 text-white border border-white/40 animate-pulse">Tekshiruv kutilmoqda</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/5 text-white/60 border border-white/10">Pending (Timer)</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/5 text-white/50 border border-white/20">Rad etilgan</span>;
      case 'expired':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/5 text-white/40 border border-white/10">Muddati o&apos;tgan</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/5 text-white/50 border border-white/10">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">To&apos;lovlar boshqaruvi</h1>
          <p className="text-white/50 text-sm">Barcha manual to&apos;lovlar, kvitansiya tekshiruvlari va tasdiqlash markazi.</p>
        </div>

        {/* Actions: Search, Refresh, Add, Export */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-mono font-black transition flex items-center gap-1.5 shadow-lg"
          >
            <Plus size={15} />
            <span>To&apos;lov qo&apos;shish</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition flex items-center gap-2 text-xs font-mono font-bold"
            title="CSV yuklab olish"
          >
            <Download size={15} />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={() => fetchPayments(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition flex items-center gap-2 text-xs font-mono font-bold disabled:opacity-50"
            title="Ro'yxatni yangilash"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Yangilash</span>
          </button>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buyurtma ID, ism, telefon..."
              className="w-full bg-[#000000] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000000] border border-white/15 rounded-3xl p-5 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">Tekshiruv kutilmoqda</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{pendingVerificationCount}</div>
          <span className="text-[11px] text-white/40 mt-1 block">Yangi yuborilgan kvitansiyalar</span>
        </div>

        <div className="bg-[#000000] border border-white/15 rounded-3xl p-5 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">Jami tushum</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {new Intl.NumberFormat('uz-UZ').format(totalRevenue)} UZS
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Tasdiqlangan to&apos;lovlar</span>
        </div>

        <div className="bg-[#000000] border border-white/15 rounded-3xl p-5 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">Tasdiqlangan</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{approvedCount}</div>
          <span className="text-[11px] text-white/40 mt-1 block">Faol obunalar</span>
        </div>

        <div className="bg-[#000000] border border-white/15 rounded-3xl p-5 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">Rad etilgan</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <XCircle size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{rejectedCount}</div>
          <span className="text-[11px] text-white/40 mt-1 block">Noto&apos;g&apos;ri to&apos;lovlar</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {([
          { id: 'all', label: 'Barchasi', count: payments.length },
          { id: 'receipt_submitted', label: 'Kvitansiyalar', count: pendingVerificationCount },
          { id: 'approved', label: 'Tasdiqlangan', count: approvedCount },
          { id: 'pending', label: 'Jarayonda', count: pendingCount },
          { id: 'rejected', label: 'Rad etilgan', count: rejectedCount },
        ] as { id: PaymentStatusFilter; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              statusFilter === tab.id
                ? 'bg-white text-black font-black shadow-lg'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              statusFilter === tab.id ? 'bg-black text-white' : 'bg-white/10 text-white/60'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Payments Table */}
      <div className="bg-[#000000] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/70">
            <thead className="text-[11px] text-white/40 uppercase font-mono bg-white/[0.02] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Buyurtma ID</th>
                <th className="px-6 py-4 font-bold">Foydalanuvchi</th>
                <th className="px-6 py-4 font-bold">Kurs</th>
                <th className="px-6 py-4 font-bold">Summa</th>
                <th className="px-6 py-4 font-bold">Holat</th>
                <th className="px-6 py-4 font-bold">Chek</th>
                <th className="px-6 py-4 font-bold">Sana</th>
                <th className="px-6 py-4 text-right font-bold">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredPayments.map((p) => {
                const isPendingReceipt = p.status === 'receipt_submitted';

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-white text-xs block">{p.order_id || p.id.slice(0, 8)}</span>
                      <span className="text-[10px] font-mono text-white/40 uppercase">{p.provider || 'CLICK'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-xs">
                        {p.first_name || p.profiles?.full_name || 'Noma\'lum'}
                      </div>
                      <div className="text-[11px] text-white/40 font-mono">{p.phone || p.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{p.courses?.title || 'Kurs'}</div>
                      <span className="text-[10px] text-white/40 uppercase font-mono">{p.courses?.level || 'PRO'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black font-mono text-white text-xs block">
                        {new Intl.NumberFormat('uz-UZ').format(p.amount)} {p.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-6 py-4">
                      {p.receipt_url ? (
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg transition font-mono text-[11px] font-bold flex items-center gap-1 border border-white/15"
                        >
                          <Eye size={12} /> Ko&apos;rish
                        </button>
                      ) : (
                        <span className="text-white/30 text-[10px] font-mono">Yuklanmagan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-white/40">
                      {new Date(p.submitted_at || p.created_at).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isPendingReceipt && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-md disabled:opacity-50"
                              title="Tasdiqlash va kursni ochish"
                            >
                              <Check size={13} /> Tasdiqlash
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setShowRejectInput(true);
                              }}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs rounded-lg border border-white/10 transition"
                              title="Rad etish"
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="p-1.5 text-white/40 hover:text-white rounded-lg transition"
                          title="Batafsil"
                        >
                          <ExternalLink size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-white/40 font-mono text-xs">
                    To&apos;lovlar topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Receipt & Details Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <h3 className="text-xl font-black text-white">To&apos;lov Kvitansiyasi</h3>
                  <span className="text-xs font-mono text-white/50">{selectedPayment.order_id}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedPayment(null);
                    setShowRejectInput(false);
                  }}
                  className="p-2 text-white/60 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Receipt Image Preview */}
              <div className="bg-black border border-white/10 rounded-2xl overflow-hidden mb-6 flex items-center justify-center min-h-[220px] max-h-[360px] p-2">
                {selectedPayment.receipt_url ? (
                  <img
                    src={selectedPayment.receipt_url}
                    alt="Payment Receipt"
                    className="max-h-[340px] w-auto object-contain rounded-lg"
                  />
                ) : (
                  <span className="text-white/40 text-xs font-mono">Kvitansiya rasmi mavjud emas</span>
                )}
              </div>

              {/* Details Info */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-2.5 font-mono text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-white/50">To&apos;lovchi:</span>
                  <span className="text-white font-bold">{selectedPayment.first_name} {selectedPayment.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Telefon:</span>
                  <span className="text-white font-bold">{selectedPayment.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Kurs:</span>
                  <span className="text-white font-bold">{selectedPayment.courses?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Summa:</span>
                  <span className="text-white font-black text-sm">
                    {new Intl.NumberFormat('uz-UZ').format(selectedPayment.amount)} {selectedPayment.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">To&apos;lov usuli:</span>
                  <span className="text-white uppercase font-bold">{selectedPayment.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Holati:</span>
                  <span>{getStatusBadge(selectedPayment.status)}</span>
                </div>
                {selectedPayment.comment && (
                  <div className="pt-2 border-t border-white/5 text-white/70">
                    <span className="text-white/40 block mb-1">Izoh:</span>
                    {selectedPayment.comment}
                  </div>
                )}
              </div>

              {/* Reject Reason Box */}
              {showRejectInput && (
                <div className="mb-6 p-4 bg-white/5 border border-white/20 rounded-2xl space-y-3">
                  <label className="text-xs font-mono text-white/80 block font-bold">
                    Rad etish sababi:
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Masalan: Chek summasi to'liq emas yoki rasm tushunarsiz"
                    className="w-full bg-[#000] border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white font-mono"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={() => handleReject(selectedPayment.id)}
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-neutral-200 transition"
                    >
                      Rad etishni tasdiqlash
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                {selectedPayment.status === 'receipt_submitted' && !showRejectInput && (
                  <>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      disabled={isProcessing}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} /> Rad etish
                    </button>
                    <button
                      onClick={() => handleApprove(selectedPayment.id)}
                      disabled={isProcessing}
                      className="px-6 py-3 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-xl"
                    >
                      <CheckCircle2 size={16} /> Tasdiqlash & Kursni ochish
                    </button>
                  </>
                )}
                {selectedPayment.status === 'approved' && (
                  <div className="text-xs text-white/80 font-mono py-2 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-white" /> Ushbu to&apos;lov tasdiqlangan va kurs ochilgan.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Manual Add Payment Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <h3 className="text-xl font-black text-white">Qo&apos;lda To&apos;lov Qo&apos;shish</h3>
                  <p className="text-xs text-white/50">Naqd, bank yoki to‘g‘ridan-to‘g‘ri qilingan to‘lovlarni kiritish.</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-white/60 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleManualAddSubmit} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-white/70 uppercase mb-1">To&apos;lovchi Ism & Familiyasi *</label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Ism Familiya"
                    className="w-full bg-black border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 uppercase mb-1">Telefon raqam</label>
                    <input
                      type="text"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 uppercase mb-1">To&apos;lov Usuli</label>
                    <select
                      value={manualProvider}
                      onChange={(e) => setManualProvider(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition uppercase"
                    >
                      <option value="click">Click</option>
                      <option value="payme">Payme</option>
                      <option value="uzum">Uzum</option>
                      <option value="card">Bank / Karta</option>
                      <option value="cash">Naqd pul</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 uppercase mb-1">Kurs</label>
                    <select
                      value={manualCourse}
                      onChange={(e) => {
                        setManualCourse(e.target.value);
                        if (e.target.value.includes('2222')) setManualAmount('499000');
                        else setManualAmount('299000');
                      }}
                      className="w-full bg-black border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                    >
                      <option value="11111111-1111-1111-1111-111111111111">STANDARD (299 000 so‘m)</option>
                      <option value="22222222-2222-2222-2222-222222222222">PRO TRADING (499 000 so‘m)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 uppercase mb-1">Summa (UZS)</label>
                    <input
                      type="number"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 uppercase mb-1">Holati</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setManualStatus('approved')}
                      className={`py-2 rounded-xl border text-center font-bold transition ${
                        manualStatus === 'approved'
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      ✓ Darhol Tasdiqlash
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualStatus('receipt_submitted')}
                      className={`py-2 rounded-xl border text-center font-bold transition ${
                        manualStatus === 'receipt_submitted'
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      Tekshiruvga qo&apos;yish
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 uppercase mb-1">Izoh (ixtiyoriy)</label>
                  <input
                    type="text"
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    placeholder="Masalan: Ofisda naqd qabul qilindi"
                    className="w-full bg-black border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-white/60 hover:text-white"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-6 py-2.5 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition shadow-lg"
                  >
                    Saqlash
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
