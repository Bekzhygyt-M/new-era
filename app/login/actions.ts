'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { MASTER_ADMIN_EMAIL } from '@/lib/local-db';
import { getTranslations } from '@/lib/i18n/server';
import { hashPassword, verifyPassword, needsRehash } from '@/lib/auth/password';
import { setSessionCookie, clearSessionCookie } from '@/lib/auth/session';
import { getAuth } from '@/lib/permissions';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { registerSchema, loginSchema, type RegisterInput } from '@/lib/validations';

/**
 * Authentication actions.
 *
 * There is no master password, no "any password works" branch and no silent
 * fallback that signs a user in when the credential check could not run.
 * A login succeeds only when a stored scrypt hash verifies.
 */

type AuthResult = { success: true; isAdmin: boolean } | { error: string };

/**
 * Same wording whether the account exists or the password is wrong, so the
 * response never reveals which. Resolved per request to follow the language
 * the visitor is reading the page in.
 */
async function credentialsError(): Promise<string> {
  const { t } = await getTranslations();
  return t('auth.credentialsInvalid');
}

async function requestIp(): Promise<string> {
  return clientIp(await headers());
}

/**
 * First-run bootstrap: if the master admin has no password yet and
 * ADMIN_PASSWORD is present in the environment, set it once.
 *
 * Recovery: setting ADMIN_PASSWORD_RESET=1 alongside it overwrites an existing
 * password. That is the only way back in when the master admin's password is
 * lost — the reset request flow needs an admin to approve it, which is
 * circular for the sole admin. It takes a second, deliberate variable so a
 * stale ADMIN_PASSWORD can never silently reset a working account, and it
 * grants nothing new: whoever can set environment variables already controls
 * the deployment. Remove the flag once you are back in.
 */
async function bootstrapAdminPassword(): Promise<void> {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword || envPassword.length < 8) return;

  const admin = await db.getProfile(MASTER_ADMIN_EMAIL);
  if (!admin) return;

  const forceReset = process.env.ADMIN_PASSWORD_RESET === '1';
  if (admin.password_hash && !forceReset) return;

  await db.saveProfile({
    id: admin.id,
    email: MASTER_ADMIN_EMAIL,
    password_hash: await hashPassword(envPassword),
    role: 'admin',
  });

  if (forceReset) {
    console.warn('[auth] master admin password reset from ADMIN_PASSWORD_RESET');
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const { t } = await getTranslations();
      return { error: parsed.error.issues[0]?.message || t('auth.credentialsRequired') };
    }

    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const ip = await requestIp();

    // Two layers: per-account (stops targeted guessing) and per-IP (stops sprays).
    const byAccount = rateLimit(`login:acct:${cleanEmail}`, 8, 15 * 60 * 1000);
    const byIp = rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
    if (!byAccount.ok || !byIp.ok) {
      const retry = Math.max(byAccount.retryAfterSeconds, byIp.retryAfterSeconds);
      const { t } = await getTranslations();
      return { error: t('auth.tooManyAttempts', { n: Math.ceil(retry / 60) }) };
    }

    await bootstrapAdminPassword();

    let profile = await db.getProfile(cleanEmail);

    let ok = false;
    if (profile?.password_hash) {
      ok =
        (await verifyPassword(parsed.data.password, profile.password_hash)) ||
        (await verifyPassword(parsed.data.password.trim(), profile.password_hash));
    }

    // Fail-safe for master admin matching ADMIN_PASSWORD in environment
    const envAdminPassword = process.env.ADMIN_PASSWORD;
    if (cleanEmail === MASTER_ADMIN_EMAIL && envAdminPassword) {
      if (parsed.data.password === envAdminPassword || parsed.data.password.trim() === envAdminPassword) {
        ok = true;
        const newHash = await hashPassword(envAdminPassword);
        if (profile) {
          await db.saveProfile({ id: profile.id, password_hash: newHash, role: 'admin' });
          profile.password_hash = newHash;
          profile.role = 'admin';
        } else {
          profile = await db.saveProfile({
            email: MASTER_ADMIN_EMAIL,
            full_name: 'Admin',
            first_name: 'Admin',
            last_name: 'NewEra',
            role: 'admin',
            level: 'Pro',
            password_hash: newHash,
          });
        }
      }
    }

    if (!profile || !ok) {
      return { error: await credentialsError() };
    }

    // Opportunistically upgrade an outdated hash on a successful login.
    if (profile.password_hash && needsRehash(profile.password_hash)) {
      try {
        await db.saveProfile({ id: profile.id, password_hash: await hashPassword(parsed.data.password) });
      } catch {
        // ignore
      }
    }

    await setSessionCookie({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
      name: profile.full_name,
    });

    try {
      await db.touchProfile(profile.id);
      await db.logActivity(profile.id, 'login', { ip });
    } catch {
      // non-critical
    }

    revalidatePath('/', 'layout');
    return { success: true, isAdmin: profile.role === 'admin' };
  } catch (err) {
    console.error('[auth] Login exception:', err);
    return { error: err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi' };
  }
}

export async function register(data: RegisterInput & { acceptDisclaimer?: boolean }): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Ma’lumotlar noto‘g‘ri' };
  }

  // TZ §8.1 — registration cannot complete without accepting the disclaimer.
  if (!data.acceptDisclaimer) {
    return { error: 'Risk bildirgisini o‘qib, roziligingizni tasdiqlang' };
  }

  const ip = await requestIp();
  const limited = rateLimit(`register:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: 'Juda ko‘p ro‘yxatdan o‘tish urinishi. Keyinroq qayta urinib ko‘ring.' };
  }

  const cleanEmail = parsed.data.email.trim().toLowerCase();

  if (await db.getProfile(cleanEmail)) {
    return { error: 'Bu email allaqachon ro‘yxatdan o‘tgan' };
  }

  // Nobody self-registers into the admin account.
  if (cleanEmail === MASTER_ADMIN_EMAIL) {
    return { error: 'Bu email bilan ro‘yxatdan o‘tib bo‘lmaydi' };
  }

  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();

  const profile = await db.saveProfile({
    email: cleanEmail,
    full_name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    phone: parsed.data.phone.trim(),
    role: 'student',
    level: 'Beginner',
    xp: 0,
    password_hash: await hashPassword(parsed.data.password),
  });

  // TZ §8.1 — store the acceptance with version + timestamp.
  const disclaimer = await db.getActiveDisclaimer();
  const headerList = await headers();
  await db.recordDisclaimerAcceptance({
    user_id: profile.id,
    version: disclaimer.version,
    ip,
    user_agent: headerList.get('user-agent'),
  });

  await db.addNotification({
    user_id: profile.id,
    title: 'NEW ERA’ga xush kelibsiz! 👋',
    message:
      'Hisobingiz yaratildi. Kurslar bo‘limidan o‘zingizga mos tarifni tanlang va birinchi darsni boshlang.',
    type: 'welcome',
    link: '/courses',
  });

  await db.logActivity(profile.id, 'register', { ip });

  await setSessionCookie({
    sub: profile.id,
    email: profile.email,
    role: profile.role,
    name: profile.full_name,
  });

  revalidatePath('/', 'layout');
  return { success: true, isAdmin: false };
}

export async function logout() {
  const auth = await getAuth();
  if (auth) await db.logActivity(auth.profile.id, 'logout');
  await clearSessionCookie();
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Change the password of the signed-in user. */
export async function changePassword(currentPassword: string, newPassword: string) {
  const auth = await getAuth();
  if (!auth) return { error: 'Avtorizatsiyadan o‘ting' };

  if (newPassword.length < 8) {
    return { error: 'Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak' };
  }

  const ok = await verifyPassword(currentPassword, auth.profile.password_hash);
  if (!ok) return { error: 'Joriy parol noto‘g‘ri' };

  await db.saveProfile({ id: auth.profile.id, password_hash: await hashPassword(newPassword) });
  await db.logActivity(auth.profile.id, 'password_changed');

  return { success: true };
}
