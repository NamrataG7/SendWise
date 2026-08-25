import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';

// TODO(phase-2): require parent auth + verify parent is linked to this user_id_hash
// (check membership of `parent:{parent_id}:children` set). For now, open read.
export async function GET(
  _req: NextRequest,
  { params }: { params: { user_id_hash: string } },
) {
  const { user_id_hash } = params;
  if (!/^[a-f0-9]{64}$/i.test(user_id_hash)) {
    return NextResponse.json({ error: 'Invalid user_id_hash' }, { status: 400 });
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
