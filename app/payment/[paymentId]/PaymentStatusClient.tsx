'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, XCircle, Loader2, AlertTriangle, Hourglass } from 'lucide-react';

/**
 * Order status with live polling (TZ §19).
 * The status and the remaining time both come from the server.
 *
 * This page is about the PAYMENT only. Course access (including the private
 * Telegram channel) is opened from the dashboard's "Darslarga o‘tish" button,
 * so no invite link is ever requested or rendered here.
 */

type Status = 'pending' | 'receipt_submitted' | 'approved' | 'rejected' | 'expired' | 'cancelled';

interface Props {
  paymentId: string;
  orderId: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  initialStatus: Status;
  initialRemaining: number;
  rejectionReason: string | null;
  submittedAt: string | null;
}

const STATUS_META: Record<Status, { label: string; tone: string; icon: typeof Clock }> = {
  pending: { label: 'To‘lov kutilmoqda', tone: 'text-white', icon: Clock },
  receipt_submitted: { label: 'Tekshirilmoqda', tone: 'text-amber-300', icon: Hourglass },
  approved: { label: 'Tasdiqlandi', tone: 'text-emerald-300', icon: CheckCircle2 },
  rejected: { label: 'Rad etildi', tone: 'text-red-300', icon: XCircle },
  expired: { label: 'Muddati tugadi', tone: 'text-white/40', icon: AlertTriangle },
  cancelled: { label: 'Bekor qilindi', tone: 'text-white/40', icon: XCircle },
};

/** States that can still change; everything else is final, so polling stops. */
const LIVE: ReadonlySet<Status> = new Set<Status>(['pending', 'receipt_submitted']);

export default function PaymentStatusClient(props: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(props.initialStatus);
  const [remaining, setRemaining] = useState(props.initialRemaining);
  const [reason, setReason] = useState(props.rejectionReason);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment/status?paymentId=${encodeURIComponent(props.paymentId)}`);
      if (!res.ok) return;

      const data = await res.json();
      setRemaining(data.remainingSeconds);
      setReason(data.rejectionReason);
      setStatus((previous) => {
        // Refresh server components only on the transition INTO approved —
        // never on every poll, which previously re-rendered the page in a loop.
        if (data.status === 'approved' && previous !== 'approved') router.refresh();
        return data.status;
      });
    } catch {
      // Transient failure — the next poll picks it up.
    }
  }, [props.paymentId, router]);

  // Poll only while the order can still change; stop once it is settled.
  useEffect(() => {
    if (!LIVE.has(status)) return;

    const timer = setInterval(poll, 8000);
    return () => clearInterval(timer);
  }, [poll, status]);

  useEffect(() => {
    if (status !== 'pending' || remaining <= 0) return;
    const tick = setInterval(() => setRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(tick);
  }, [remaining, status]);

  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <Icon size={34} className={`mx-auto mb-3 ${meta.tone}`} />
        <h1 className={`text-lg font-black tracking-tight ${meta.tone}`}>{meta.label}</h1>
        <p className="mt-1 font-mono text-[12px] text-white/40">{props.orderId}</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <dl className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">Kurs</dt>
            <dd className="text-right font-semibold text-white">{props.courseTitle}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">Summa</dt>
            <dd className="font-mono font-bold text-white">
              {new Intl.NumberFormat('uz-UZ').format(props.amount)} {props.currency}
            </dd>
          </div>
          {props.submittedAt && (
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Chek yuborilgan</dt>
              <dd className="text-white/70">{new Date(props.submittedAt).toLocaleString('uz-UZ')}</dd>
            </div>
          )}
          {status === 'pending' && remaining > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Qolgan vaqt</dt>
              <dd className="font-mono font-bold text-white" aria-live="polite">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {status === 'receipt_submitted' && (
        <p className="flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-[12.5px] leading-relaxed text-amber-100/80">
          <Loader2 size={15} className="shrink-0 animate-spin" />
          Chekingiz admin tekshiruvida. Tasdiqlangach kurs avtomatik ochiladi va bildirishnoma keladi.
        </p>
      )}

      {status === 'rejected' && reason && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4">
          <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-red-300">
            Rad etish sababi
          </p>
          <p className="text-[13px] leading-relaxed text-white/70">{reason}</p>
        </div>
      )}

      {status === 'approved' && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 text-[12.5px] leading-relaxed text-emerald-100/80">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" />
          To‘lov tasdiqlandi. Kursga Kabinetdagi “Darslarga o‘tish” tugmasi orqali kiring.
        </p>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        {status === 'approved' ? (
          <Link
            href="/dashboard"
            className="flex-1 rounded-xl bg-white py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
          >
            Kabinetga o‘tish
          </Link>
        ) : status === 'rejected' || status === 'expired' || status === 'cancelled' ? (
          <Link
            href={`/checkout/${props.courseId}`}
            className="flex-1 rounded-xl bg-white py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
          >
            Qayta urinib ko‘rish
          </Link>
        ) : null}

        {status !== 'approved' && (
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/12 px-6 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Kabinet
          </Link>
        )}
      </div>
    </div>
  );
}
