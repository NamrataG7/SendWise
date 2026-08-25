import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChildrenForParent } from '@/lib/parent-store';

export const runtime = 'nodejs';

/**
 * GET /api/parent/children
 * Returns the set of user_id_hashes linked to the authenticated parent.
 * Middleware also protects this path, but we re-check the session here
 * for defence in depth and to have the email available.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const children = await getChildrenForParent(email);
  return NextResponse.json({ children });
}
