import { NextResponse } from 'next/server';
import { getFaqRows } from '@/lib/content/faq';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ faqs: getFaqRows() });
}
