import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Public list for the homepage marquee — enabled methods only (TZ §4.3). */
export async function GET() {
  const methods = (await db.getPaymentMethods(true)).map((m) => ({
    id: m.id,
    name: m.name,
    logo: m.logo,
    supported: m.supported,
  }));
  return NextResponse.json({ methods });
}
