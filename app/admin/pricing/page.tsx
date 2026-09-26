import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';
import AdminPricingClient from './AdminPricingClient';

export const dynamic = 'force-dynamic';

export default async function AdminPricingPage() {
  await requireAdminPage();
  const settings = await db.getSettings();

  const pricing = settings.pricing || {
    standard: { daily: 19000, monthly: 299000, yearly: 2499000 },
    pro: { daily: 39000, monthly: 499000, yearly: 4999000 },
  };

  const cards = settings.cards || [
    {
      id: 'card_humo',
      type: 'Humo',
      number: '9860 1701 1477 2172',
      raw_number: '9860170114772172',
      holder: 'Abbos Erkinov',
      is_primary: true,
    },
    {
      id: 'card_uzcard',
      type: 'Uzkart',
      number: '5614 6821 1727 0571',
      raw_number: '5614682117270571',
      holder: 'Abbos Erkinov',
      is_primary: false,
    },
    {
      id: 'card_visa',
      type: 'Visa',
      number: '4023 0602 4867 3021',
      raw_number: '4023060248673021',
      holder: 'Abbos Erkinov',
      is_primary: false,
    },
  ];

  return (
    <AdminPricingClient
      initialPricing={pricing}
      initialCourseLimitDays={settings.course_limit_days || 30}
      initialCards={cards}
    />
  );
}
