import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import CheckoutClient from './CheckoutClient';
import { requireUserPage, canAccessCourse } from '@/lib/permissions';
import { db } from '@/lib/db';
import { MANUAL_PROVIDERS } from '@/lib/payments/provider';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ period?: string }>;
}) {
  const { courseId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const period = (resolvedSearchParams?.period as 'daily' | 'monthly' | 'yearly') || 'monthly';

  const auth = await requireUserPage(`/checkout/${courseId}`);

  const course = await db.getCourse(courseId);
  if (!course || !course.published) notFound();

  // Already owns it — no reason to pay twice.
  if (await canAccessCourse(auth.profile, course.id) && await db.hasEnrollment(auth.profile.id, course.id)) {
    redirect(`/course/${course.id}`);
  }

  const settings = await db.getSettings();

  const pricing = settings.pricing?.[course.slug as 'standard' | 'pro'];
  const price = pricing?.[period] || course.price;

  const defaultCards = [
    { id: 'card_humo', type: 'Humo', number: '9860 1701 1477 2172', raw_number: '9860170114772172', holder: 'Abbos Erkinov' },
    { id: 'card_uzcard', type: 'Uzkart', number: '5614 6821 1727 0571', raw_number: '5614682117270571', holder: 'Abbos Erkinov' },
    { id: 'card_visa', type: 'Visa', number: '4023 0602 4867 3021', raw_number: '4023060248673021', holder: 'Abbos Erkinov' },
  ];

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
        <CheckoutClient
          course={{
            id: course.id,
            title: course.title,
            price,
            currency: course.currency,
            shortDescription: course.short_description,
          }}
          period={period}
          profile={{
            firstName: auth.profile.first_name || auth.profile.full_name.split(' ')[0] || '',
            lastName: auth.profile.last_name || auth.profile.full_name.split(' ').slice(1).join(' ') || '',
            phone: auth.profile.phone || '',
          }}
          providers={MANUAL_PROVIDERS}
          settings={{
            windowMinutes: settings.payment_window_minutes,
            instructions: settings.payment_instructions,
            cardNumber: settings.card_number,
            cardHolder: settings.card_holder,
            cards: settings.cards || defaultCards,
          }}
        />
      </main>
    </div>
  );
}
