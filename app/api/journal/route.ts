import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { journalTradeSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/** Journal entries are strictly per-user (TZ §17, §29). */
export async function GET() {
  try {
    const { profile } = await requireUserApi();
    const trades = await db.getJournal(profile.id);

    const wins = trades.filter((t) => t.status === 'WIN').length;
    const losses = trades.filter((t) => t.status === 'LOSS').length;
    const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));

    return NextResponse.json({
      trades,
      stats: {
        total: trades.length,
        wins,
        losses,
        breakeven: trades.length - wins - losses,
        winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
        netPnl,
        grossProfit,
        grossLoss,
        profitFactor: grossLoss ? Number((grossProfit / grossLoss).toFixed(2)) : null,
        averageWin: wins ? Math.round(grossProfit / wins) : 0,
        averageLoss: losses ? Math.round(grossLoss / losses) : 0,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUserApi();
    const body = await request.json();
    const parsed = journalTradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const trade = await db.saveJournalTrade(profile.id, parsed.data);
    await db.logActivity(profile.id, 'journal_entry', { trade_id: trade.id });

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { profile } = await requireUserApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const deleted = await db.deleteJournalTrade(profile.id, id);
    if (!deleted) return NextResponse.json({ error: 'Yozuv topilmadi' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
