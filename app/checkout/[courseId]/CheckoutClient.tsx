'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Clock,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Checkout flow (TZ §19).
 *
 * Order → server deadline → transfer → receipt upload → admin verification.
 * The countdown shown here is cosmetic: `remainingSeconds` is re-read from
 * /api/payment/status, which computes it from the stored `expires_at`.
 */

interface CardInfo {
  id?: string;
  type: string;
  number: string;
  raw_number?: string;
  holder: string;
}

interface Props {
  course: { id: string; title: string; price: number; currency: string; shortDescription: string };
  period?: 'daily' | 'monthly' | 'yearly';
  profile: { firstName: string; lastName: string; phone: string };
  providers: { id: string; label: string }[];
  settings: {
    windowMinutes: number;
    instructions: string;
    cardNumber: string;
    cardHolder: string;
    cards?: CardInfo[];
  };
}

interface Order {
  paymentId: string;
  orderId: string;
  expiresAt: string;
  amount: number;
  currency: string;
}

type Step = 'method' | 'pay' | 'done';

function formatMoney(amount: number, currency: string) {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} ${currency}`;
}

function formatClock(seconds: number) {
  const m = Math.floor(Math.max(seconds, 0) / 60);
  const s = Math.max(seconds, 0) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CheckoutClient({ course, period = 'monthly', profile, providers, settings }: Props) {
  const { t } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState<Step>('method');
  const [provider, setProvider] = useState(providers[0]?.id ?? 'card');
  const [order, setOrder] = useState<Order | null>(null);
  const [remaining, setRemaining] = useState(settings.windowMinutes * 60);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone || '+998 ',
    comment: '',
  });
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Countdown, reconciled with the server every 15s ───────────────────────
  const syncStatus = useCallback(async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payment/status?paymentId=${encodeURIComponent(paymentId)}`);
      if (!res.ok) return;
      const data = await res.json();

      setRemaining(data.remainingSeconds);

      if (data.status === 'expired') {
        setStep('method');
        setOrder(null);
        toast.error('Buyurtma muddati tugadi. Yangi buyurtma yarating.');
      } else if (data.status === 'receipt_submitted' || data.status === 'approved') {
        setStep('done');
      }
    } catch {
      // Keep the local countdown running; the next sync corrects it.
    }
  }, []);

  useEffect(() => {
    if (!order || step !== 'pay') return;

    const tick = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          void syncStatus(order.paymentId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const sync = setInterval(() => void syncStatus(order.paymentId), 15000);

    return () => {
      clearInterval(tick);
      clearInterval(sync);
    };
  }, [order, step, syncStatus]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const createOrder = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, provider, period }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Buyurtma yaratilmadi');
        return;
      }

      setOrder({
        paymentId: data.paymentId,
        orderId: data.orderId,
        expiresAt: data.expiresAt,
        amount: data.amount,
        currency: data.currency,
      });
      setRemaining(
        Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000))
      );
      setStep('pay');
    } catch {
      toast.error('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setCreating(false);
    }
  };

  const uploadReceipt = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/upload/file?kind=receipt', { method: 'POST', body });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Faylni yuklab bo‘lmadi');
        return;
      }

      setReceiptUrl(data.url);
      setReceiptName(data.fileName);
      toast.success('Chek yuklandi');
    } catch {
      toast.error('Faylni yuklashda tarmoq xatosi');
    } finally {
      setUploading(false);
    }
  };

  const submitReceipt = async () => {
    if (!order) return;

    if (!receiptUrl) {
      toast.error('Chek skrinshotini yuklang');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/payment/submit-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: order.paymentId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          receiptUrl,
          comment: form.comment.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Chekni yuborib bo‘lmadi');
        return;
      }

      toast.success('Chek adminga yuborildi va tekshiruv navbatiga qo‘shildi');

      setStep('done');
      router.push(`/payment/${order.paymentId}`);
    } catch {
      toast.error('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    await fetch('/api/payment/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: order.paymentId }),
    });
    setOrder(null);
    setStep('method');
    toast.info('Buyurtma bekor qilindi');
  };

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(settings.cardNumber.replace(/\s/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nusxalab bo‘lmadi — raqamni qo‘lda yozing');
    }
  };

  const expired = remaining <= 0;

  return (
    <div className="space-y-5">
      {/* Order summary */}
      <header className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">Buyurtma</p>
        <h1 className="text-xl font-black tracking-tight">{course.title}</h1>
        <p className="mt-1 text-[13px] text-white/45">{course.shortDescription}</p>
        <p className="mt-4 font-mono text-2xl font-black text-white">
          {formatMoney(course.price, course.currency)}
        </p>
      </header>

      {/* Step 1 — method */}
      {step === 'method' && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 text-[11px] font-black uppercase tracking-wider text-white/50">
            {t('payment.choosePayment')}
          </h2>

          <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
            {providers.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${
                  provider === p.id ? 'border-white bg-white/[0.07]' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p.id}
                  checked={provider === p.id}
                  onChange={() => setProvider(p.id)}
                  className="sr-only"
                />
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                    provider === p.id ? 'border-white bg-white' : 'border-white/25'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[13px] font-semibold text-white/85">{p.label}</span>
              </label>
            ))}
          </div>

          <p className="mb-5 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-[12px] leading-relaxed text-white/50">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-white/40" />
            To‘lov qo‘lda tekshiriladi. Buyurtma yaratilgach {settings.windowMinutes} daqiqa ichida
            to‘lovni amalga oshirib, chek skrinshotini yuklashingiz kerak.
          </p>

          <button
            type="button"
            onClick={createOrder}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            {t('payment.startOrder')}
          </button>
        </section>
      )}

      {/* Step 2 — pay + receipt */}
      {step === 'pay' && order && (
        <>
          <section
            className={`rounded-2xl border p-5 ${
              expired ? 'border-red-500/30 bg-red-500/[0.06]' : 'border-white/10 bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                  {t('payment.orderNumber')}
                </p>
                <p className="font-mono text-sm font-bold text-white">{order.orderId}</p>
              </div>

              <div className="text-right">
                <p className="mb-0.5 flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  <Clock size={11} /> Qolgan vaqt
                </p>
                <p
                  className={`font-mono text-2xl font-black ${expired ? 'text-red-400' : 'text-white'}`}
                  aria-live="polite"
                >
                  {formatClock(remaining)}
                </p>
              </div>
            </div>

            {expired && (
              <p className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-red-300">
                <AlertTriangle size={13} /> Muddat tugadi. Yangi buyurtma yarating.
              </p>
            )}
          </section>

          {!expired && (
            <>
              {/* Transfer details */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-[11px] font-black uppercase tracking-wider text-white/50">
                  {t('payment.paymentDetails')}
                </h2>

                <p className="mb-4 whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/55">
                  {settings.instructions}
                </p>

                <div className="space-y-2.5 mb-4">
                  {(settings.cards && settings.cards.length > 0 ? settings.cards : [
                    { type: 'Humo', number: '9860 1701 1477 2172', raw_number: '9860170114772172', holder: 'Abbos Erkinov' },
                    { type: 'Uzkart', number: '5614 6821 1727 0571', raw_number: '5614682117270571', holder: 'Abbos Erkinov' },
                    { type: 'Visa', number: '4023 0602 4867 3021', raw_number: '4023060248673021', holder: 'Abbos Erkinov' },
                  ]).map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] p-3.5 hover:border-pink-500/30 transition">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-black uppercase text-pink-400 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                            {c.type}
                          </span>
                          <span className="text-[11px] text-white/50">{c.holder}</span>
                        </div>
                        <p className="truncate font-mono text-base font-bold text-white tracking-wide">
                          {c.number}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const val = c.raw_number || c.number.replace(/\s+/g, '');
                          navigator.clipboard.writeText(val);
                          toast.success(`${c.type} karta raqami nusxalandi!`);
                        }}
                        aria-label="Karta raqamini nusxalash"
                        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-mono font-bold text-white/80 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
                      >
                        <Copy size={13} /> Nusxalash
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-3 font-mono text-sm font-bold text-white">
                  To‘lov summasi: {formatMoney(order.amount, order.currency)}
                </p>
              </section>

              {/* Receipt form */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-[11px] font-black uppercase tracking-wider text-white/50">
                  {t('payment.sendReceipt')}
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">
                      Ism
                    </span>
                    <input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
                      placeholder="Ismingiz"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">
                      Familiya
                    </span>
                    <input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
                      placeholder="Familiyangiz"
                      required
                    />
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Telefon
                  </span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
                    placeholder="+998 90 123 45 67"
                    required
                  />
                </label>

                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Izoh (ixtiyoriy)
                  </span>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    rows={2}
                    maxLength={500}
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
                    placeholder="Admin uchun qo‘shimcha ma’lumot"
                  />
                </label>

                {/* Upload */}
                <div className="mt-4">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    {t('payment.receiptScreenshot')}
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadReceipt(file);
                    }}
                    className="sr-only"
                  />

                  {receiptUrl ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <Check size={15} className="shrink-0 text-emerald-400" />
                        <span className="truncate text-[12.5px] font-semibold text-white/85">
                          {receiptName}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptUrl('');
                          setReceiptName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        aria-label="Chekni olib tashlash"
                        className="shrink-0 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-6 text-[12px] font-semibold text-white/50 transition hover:border-white/40 hover:text-white disabled:opacity-50"
                    >
                      {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                      {uploading ? 'Yuklanmoqda...' : 'PNG, JPG, WEBP yoki PDF tanlang'}
                    </button>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={submitReceipt}
                    disabled={submitting || !receiptUrl}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-4 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-black/40"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {t('payment.sendReceipt')}
                  </button>

                  <button
                    type="button"
                    onClick={cancelOrder}
                    className="rounded-xl border border-white/12 px-6 py-4 text-[11px] font-black uppercase tracking-wider text-white/60 transition hover:border-white/30 hover:text-white"
                  >
                    {t('payment.cancel')}
                  </button>
                </div>
              </section>
            </>
          )}

          {expired && (
            <button
              type="button"
              onClick={() => {
                setOrder(null);
                setStep('method');
              }}
              className="w-full rounded-xl bg-white py-4 text-[11px] font-black uppercase tracking-wider text-black"
            >
              {t('payment.newOrder')}
            </button>
          )}
        </>
      )}

      {step === 'done' && order && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Check size={32} className="mx-auto mb-3 text-emerald-400" />
          <p className="mb-2 text-sm font-bold text-white">{t('payment.receiptSent')}</p>
          <p className="mb-5 text-[13px] text-white/45">
            Buyurtma <span className="font-mono text-white/70">{order.orderId}</span> tekshirilmoqda.
          </p>
          <Link
            href={`/payment/${order.paymentId}`}
            className="inline-flex rounded-xl bg-white px-6 py-3 text-[11px] font-black uppercase tracking-wider text-black"
          >
            {t('payment.trackStatus')}
          </Link>
        </section>
      )}
    </div>
  );
}
