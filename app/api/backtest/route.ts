import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { backtestSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile } = await requireUserApi();
    const backtests = await db.getBacktests(profile.id);

    const totalTrades = backtests.reduce((s, b) => s + b.totalTrades, 0);
    const totalWins = backtests.reduce((s, b) => s + b.wins, 0);

    return NextResponse.json({
      backtests,
      stats: {
        count: backtests.length,
        totalTrades,
        totalWins,
        averageWinRate: totalTrades ? Math.round((totalWins / totalTrades) * 100) : 0,
        bestWinRate: backtests.reduce((best, b) => Math.max(best, b.winRate), 0),
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
    const parsed = backtestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const backtest = await db.saveBacktest(profile.id, parsed.data);
    await db.logActivity(profile.id, 'backtest_saved', { backtest_id: backtest.id });

    return NextResponse.json({ success: true, backtest });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { profile } = await requireUserApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const deleted = await db.deleteBacktest(profile.id, id);
    if (!deleted) return NextResponse.json({ error: 'Backtest topilmadi' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
