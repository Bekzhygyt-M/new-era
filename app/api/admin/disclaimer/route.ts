import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { disclaimerSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/** Risk disclaimer versions and who accepted which one (TZ §8.1, §22). */
export async function GET() {
  try {
    await requireAdminApi();
    const acceptances = await db.getAcceptances();

    return NextResponse.json({
      versions: await db.getDisclaimerVersions(),
      active: await db.getActiveDisclaimer(),
      acceptances: await Promise.all(
        acceptances.slice(-200).map(async (a) => ({
          ...a,
          user: (await db.getProfile(a.user_id))?.email || a.user_id,
        }))
      ),
      totalAcceptances: acceptances.length,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = disclaimerSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const version = await db.saveDisclaimerVersion(parsed.data);
    await db.logActivity(auth.profile.id, 'disclaimer_updated', { version: version.version });

    return NextResponse.json({ success: true, version });
  } catch (error) {
    return apiError(error);
  }
}
