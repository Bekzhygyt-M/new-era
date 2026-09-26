import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings — public platform settings for footer, contact, and client display.
 */
export async function GET() {
  try {
    const s = await db.getSettings();
    return NextResponse.json({
      currency: s.currency,
      support_telegram: s.support_telegram,
      support_email: s.support_email,
      telegram_channel_url: s.telegram_channel_url || s.support_telegram || 'https://t.me/newera_trading',
      instagram_url: s.instagram_url || 'https://instagram.com/newera_trading',
      youtube_url: s.youtube_url || 'https://youtube.com/@newera_trading',
      course_limit_days: s.course_limit_days || 30,
      cards: (s.cards || []).map((c) => ({
        id: c.id,
        type: c.type,
        number: c.number,
        holder: c.holder,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        currency: 'UZS',
        support_telegram: 'https://t.me/newerasupport_bot',
        support_email: 'support@newera.uz',
        telegram_channel_url: 'https://t.me/newera_trading',
        instagram_url: 'https://instagram.com/newera_trading',
        youtube_url: 'https://youtube.com/@newera_trading',
        course_limit_days: 30,
      },
      { status: 200 }
    );
  }
}
