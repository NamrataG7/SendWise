import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isChildOfParent } from '@/lib/parent-store';
import { computeInsights } from '@/lib/insights-server';

export const runtime = 'nodejs';

/**
 * GET /api/insights/[user_id_hash]
 *
 * Auth model matches /api/violations/[user_id_hash]:
 *   - 401 if no parent session.
 *   - 403 if parent is not linked to this child.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { user_id_hash: string } },
) {
  const { user_id_hash } = params;
  if (!/^[a-f0-9]{64}$/i.test(user_id_hash)) {
    return NextResponse.json({ error: 'Invalid user_id_hash' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await isChildOfParent(email, user_id_hash);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await computeInsights(user_id_hash);
  return NextResponse.json(payload);
}
