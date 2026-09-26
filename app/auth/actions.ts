'use server';

/**
 * Compatibility layer.
 *
 * The real implementations live in app/login/actions.ts. These wrappers keep
 * older imports working while routing everything through the hardened path.
 */

import { redirect } from 'next/navigation';
import { login as loginAction, register as registerAction, logout as logoutAction } from '@/app/login/actions';

export async function login(formData: FormData) {
  const result = await loginAction(
    String(formData.get('email') || ''),
    String(formData.get('password') || '')
  );
  if ('error' in result) return { error: result.error };
  redirect(result.isAdmin ? '/admin' : '/dashboard');
}

export async function signup(formData: FormData) {
  const result = await registerAction({
    firstName: String(formData.get('firstName') || ''),
    lastName: String(formData.get('lastName') || ''),
    phone: String(formData.get('phone') || ''),
    email: String(formData.get('email') || ''),
    password: String(formData.get('password') || ''),
    confirmPassword: String(formData.get('confirmPassword') || ''),
    acceptDisclaimer: formData.get('acceptDisclaimer') === 'on' || formData.get('acceptDisclaimer') === 'true',
  });
  if ('error' in result) return { error: result.error };
  redirect('/dashboard');
}

export async function logout() {
  await logoutAction();
  redirect('/');
}
