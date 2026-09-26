'use server';

import { revalidatePath } from 'next/cache';
import { getAuth } from '@/lib/permissions';
import { db } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth/session';
import { profileUpdateSchema } from '@/lib/validations';

/** Updates the signed-in user's own profile. Role and XP are not touched. */
export async function updateProfile(formData: FormData) {
  const auth = await getAuth();
  if (!auth) return { error: 'Avtorizatsiyadan o‘ting' };

  const parsed = profileUpdateSchema.safeParse({
    full_name: String(formData.get('fullName') || formData.get('full_name') || ''),
    phone: (formData.get('phone') as string) || auth.profile.phone || null,
    language: (formData.get('language') as 'uz' | 'ru' | 'en') || auth.profile.language || null,
    theme: (formData.get('theme') as 'dark' | 'light') || auth.profile.theme || null,
    avatar_url: (formData.get('avatar_url') as string) || auth.profile.avatar_url || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Ma’lumotlar noto‘g‘ri' };
  }

  const updated = await db.saveProfile({
    id: auth.profile.id,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone ?? undefined,
    language: parsed.data.language ?? undefined,
    theme: parsed.data.theme ?? undefined,
    avatar_url: parsed.data.avatar_url ?? undefined,
  });

  await setSessionCookie({
    sub: updated.id,
    email: updated.email,
    role: updated.role,
    name: updated.full_name,
  });

  revalidatePath('/profile');
  revalidatePath('/dashboard');

  return { success: true };
}

export { changePassword } from '@/app/login/actions';
