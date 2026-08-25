import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isChildOfParent } from '@/lib/parent-store';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';

/**
 * GET /api/violations/[user_id_hash]
 *
 * Auth model:
 *   - Requires an authenticated parent session (401 otherwise).
 *   - Parent must be linked to `user_id_hash` via the pairing set
 *     `parent:{email}:children` (403 otherwise).
 *
 * This closes the phase-1 IDOR where any signed-in parent could read any
 * child's violation stream just by knowing the hash.
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

  const raw = await redis.lrange(`violations:${user_id_hash}`, 0, -1);
  const violations = raw
    .map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter((v): v is Record<string, unknown> => v !== null);

  return NextResponse.json({ user_id_hash, count: violations.length, violations });
}
