import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminApi, apiError } from '@/lib/permissions';

export async function GET() {
  try {
    await requireAdminApi();
    const settings = await db.getSettings();
    const courses = await db.getCourses();

    return NextResponse.json({
      pricing: settings.pricing || {
        standard: { daily: 19000, monthly: 299000, yearly: 2499000 },
        pro: { daily: 39000, monthly: 499000, yearly: 4999000 },
      },
      course_limit_days: settings.course_limit_days || 30,
      cards: settings.cards || [],
      courses,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminApi();
    const body = await req.json();

    const { pricing, course_limit_days, cards, standard_price, pro_price } = body;

    const currentSettings = await db.getSettings();

    const updatedSettings = {
      ...currentSettings,
      pricing: pricing || currentSettings.pricing,
      course_limit_days: Number(course_limit_days) || 30,
      cards: Array.isArray(cards) ? cards : currentSettings.cards,
      card_number: cards?.[0]?.number || currentSettings.card_number,
      card_holder: cards?.[0]?.holder || currentSettings.card_holder,
    };

    await db.saveSettings(updatedSettings);

    // Sync base prices on courses if provided
    if (pricing?.standard?.monthly || standard_price) {
      const stdPrice = Number(pricing?.standard?.monthly || standard_price);
      await db.saveCourse({
        id: '11111111-1111-1111-1111-111111111111',
        price: stdPrice,
      });
    }

    if (pricing?.pro?.monthly || pro_price) {
      const proPrice = Number(pricing?.pro?.monthly || pro_price);
      await db.saveCourse({
        id: '22222222-2222-2222-2222-222222222222',
        price: proPrice,
      });
    }

    await db.logActivity(auth.profile.id, 'pricing_updated', {
      pricing,
      course_limit_days,
      updated_by: auth.profile.full_name,
    });

    return NextResponse.json({
      success: true,
      message: 'Narxlar va sozlamalar muvaffaqiyatli saqlandi',
      settings: updatedSettings,
    });
  } catch (error) {
    return apiError(error);
  }
}
