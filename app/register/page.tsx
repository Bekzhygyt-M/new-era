import { redirect } from 'next/navigation';
import { getSessionOrClear } from '@/lib/auth/session';
import { db } from '@/lib/db';
import RegisterClient from './RegisterClient';

export const dynamic = 'force-dynamic';

/**
 * Bounces genuinely signed-in visitors away from the form.
 *
 * This check lives here rather than in middleware because it needs the real
 * signature check: a cookie signed with an older secret decodes fine but is
 * not a session, and treating it as one sends the visitor round in circles.
 * getSessionOrClear also drops such a cookie on the way past.
 */
export default async function RegisterPage() {
  const session = await getSessionOrClear();

  if (session) {
    // The account must still exist and still hold the role the cookie claims.
    const profile = (await db.getProfile(session.sub)) || (await db.getProfile(session.email));
    if (profile) redirect(profile.role === 'admin' ? '/admin' : '/dashboard');
  }

  return <RegisterClient />;
}
