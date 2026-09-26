'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * Payment-method marquee (TZ §4.3).
 *
 * Seamless right-to-left loop, no scrollbar, no arrows, no dots. The list is
 * served from /api/payment-methods, so an admin can enable, disable or reorder
 * methods without a code change.
 *
 * Methods that are not actually settled through the platform yet are labelled
 * "Tez kunda" rather than being advertised as working — the specification
 * forbids promising a payment method that does not exist.
 */

interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  supported: boolean;
}

const FALLBACK: PaymentMethod[] = [
  { id: 'pm_humo', name: 'HUMO', logo: 'humo', supported: true },
  { id: 'pm_uzcard', name: 'UZCARD', logo: 'uzcard', supported: true },
  { id: 'pm_visa', name: 'VISA', logo: 'visa', supported: true },
  { id: 'pm_mastercard', name: 'Mastercard', logo: 'mastercard', supported: true },
  { id: 'pm_paypal', name: 'PayPal', logo: 'paypal', supported: false },
  { id: 'pm_applepay', name: 'Apple Pay', logo: 'applepay', supported: false },
  { id: 'pm_googlepay', name: 'Google Pay', logo: 'googlepay', supported: false },
  { id: 'pm_stripe', name: 'Stripe', logo: 'stripe', supported: false },
  { id: 'pm_amex', name: 'American Express', logo: 'amex', supported: false },
  { id: 'pm_unionpay', name: 'UnionPay', logo: 'unionpay', supported: false },
];

/** Inline brand marks — no external asset requests, no layout shift. */
function BrandMark({ logo, name }: { logo: string; name: string }) {
  const common = 'h-6 md:h-7 w-auto shrink-0';

  switch (logo) {
    case 'humo':
      return (
        <span className="font-mono text-xs font-black tracking-widest text-white border border-white/20 px-2 py-0.5 rounded-md bg-white/5">
          HUMO
        </span>
      );
    case 'uzcard':
      return (
        <span className="font-mono text-xs font-black tracking-widest text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md bg-emerald-500/10">
          UZCARD
        </span>
      );
    case 'visa':
      return (
        <svg viewBox="0 0 78 24" className={common} role="img" aria-label={name} fill="none">
          <path
            d="M33.6 23.6h-6.3L31.3.4h6.3l-4 23.2ZM22.1.4l-6 16-.7-3.6-2.1-10.8S13 .4 10.3.4H.4L.3.8s3 .6 6.5 2.7l5.5 20.1h6.6L28.9.4h-6.8ZM71.9 23.6H78L72.6.4h-5.4c-2.5 0-3.1 1.9-3.1 1.9l-10 21.3h6.6l1.3-3.6h8l.9 3.6h-9.9Zm-7-8.6 3.3-9 1.9 9h-5.2ZM56.6 6.3l.9-5.2S54.7 0 51.8 0c-3.2 0-10.7 1.4-10.7 8.1 0 6.3 8.8 6.4 8.8 9.7s-7.9 2.7-10.5.6l-.9 5.5s2.8 1.4 7.1 1.4c4.3 0 10.8-2.2 10.8-8.3 0-6.4-8.9-7-8.9-9.7 0-2.8 6.2-2.4 8.1-1Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'mastercard':
      return (
        <svg viewBox="0 0 48 30" className={common} role="img" aria-label={name}>
          <circle cx="16" cy="15" r="14" fill="currentColor" opacity="0.85" />
          <circle cx="32" cy="15" r="14" fill="currentColor" opacity="0.45" />
        </svg>
      );
    case 'paypal':
      return (
        <svg viewBox="0 0 24 28" className={common} role="img" aria-label={name}>
          <path
            d="M7 27h4l1-6h4c5 0 8-3 8.5-8C25 8 22 4 16 4H7L3 27h4Zm3.5-19h4c3 0 4.5 1.5 4 4.5-.4 3-2.4 4.5-5.4 4.5H9l1.5-9Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'applepay':
      return (
        <svg viewBox="0 0 40 24" className={common} role="img" aria-label={name}>
          <path
            d="M10.6 5.9c-.7.8-1.8 1.4-2.9 1.3-.1-1.1.4-2.3 1.1-3 .7-.8 1.9-1.4 2.9-1.4.1 1.2-.4 2.3-1.1 3.1Zm1.1 1.7c-1.6-.1-3 .9-3.8.9-.8 0-2-.9-3.3-.8-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5.6-.9.9-1.4 1.4-2.4-3.6-1.4-4.2-6.5-.6-8.5-1-1.3-2.4-2-3.7-2Z"
            fill="currentColor"
          />
          <text x="19" y="18" fontSize="13" fontWeight="600" fill="currentColor" fontFamily="system-ui">
            Pay
          </text>
        </svg>
      );
    case 'googlepay':
      return (
        <svg viewBox="0 0 52 24" className={common} role="img" aria-label={name}>
          <text x="0" y="18" fontSize="15" fontWeight="700" fill="currentColor" fontFamily="system-ui">
            G Pay
          </text>
        </svg>
      );
    case 'stripe':
      return (
        <svg viewBox="0 0 54 24" className={common} role="img" aria-label={name}>
          <text x="0" y="18" fontSize="15" fontWeight="700" fill="currentColor" fontFamily="system-ui">
            stripe
          </text>
        </svg>
      );
    case 'amex':
      return (
        <svg viewBox="0 0 60 24" className={common} role="img" aria-label={name}>
          <rect x="0" y="2" width="60" height="20" rx="3" fill="currentColor" opacity="0.15" />
          <text x="7" y="17" fontSize="11" fontWeight="800" fill="currentColor" fontFamily="system-ui">
            AMEX
          </text>
        </svg>
      );
    case 'unionpay':
      return (
        <svg viewBox="0 0 64 24" className={common} role="img" aria-label={name}>
          <text x="0" y="17" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="system-ui">
            UnionPay
          </text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 24" className={common} role="img" aria-label={name}>
          <rect x="1" y="3" width="38" height="18" rx="3" stroke="currentColor" fill="none" strokeWidth="1.5" />
          <rect x="1" y="8" width="38" height="3" fill="currentColor" />
        </svg>
      );
  }
}

export default function PaymentMethodsMarquee() {
  const { t } = useI18n();
  const [methods, setMethods] = useState<PaymentMethod[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/payment-methods')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.methods?.length) setMethods(data.methods);
      })
      .catch(() => {
        // Keep the fallback list; the marquee is decorative and must not break.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Duplicated once so the -50% keyframe lands exactly on a seamless repeat.
  const track = [...methods, ...methods];

  return (
    <div
      className="relative w-full overflow-hidden border-y border-white/10 bg-black/40 py-5 select-none"
      aria-label="Qabul qilinadigan to'lov usullari"
    >
      {/* Edge fades so items enter and leave without a hard cut. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-32 bg-gradient-to-r from-[#060606] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-32 bg-gradient-to-l from-[#060606] to-transparent" />

      <div className="marquee-track flex w-max items-center gap-10 md:gap-16">
        {track.map((method, index) => (
          <div
            key={`${method.id}-${index}`}
            className="flex items-center gap-2.5 text-white/45 transition-colors duration-300 hover:text-white"
            aria-hidden={index >= methods.length}
          >
            <BrandMark logo={method.logo} name={method.name} />
            <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest">
              {method.name}
            </span>
            {!method.supported && (
              <span className="whitespace-nowrap rounded border border-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/35">
                {t('common.comingSoonShort')}
              </span>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .marquee-track {
          animation: marquee-scroll 42s linear infinite;
        }

        @keyframes marquee-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
            flex-wrap: wrap;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
