import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { adminSettingsSchema } from '@/lib/validations';
import { supabaseConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminApi();
    return NextResponse.json({
      settings: await db.getSettings(),
      // Booleans only — secrets are never returned to the browser.
      integrations: {
        supabaseConfigured: supabaseConfig.isConfigured,
        supabaseServiceRole: supabaseConfig.hasServiceRole,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = adminSettingsSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const settings = await db.saveSettings(parsed.data);
    await db.logActivity(auth.profile.id, 'settings_updated');

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiError(error);
  }
}
