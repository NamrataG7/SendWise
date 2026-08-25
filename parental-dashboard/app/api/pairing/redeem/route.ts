import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { PairingRedeemSchema } from '@/lib/schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PairingRedeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { code, parent_id } = parsed.data;

  const key = `pairing:${code}`;
  const user_id_hash = await redis.get(key);
  if (!user_id_hash) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 });
  }

  // One-time use: link child to parent then invalidate the code.
  await redis.sadd(`parent:${parent_id}:children`, user_id_hash);
  await redis.del(key);

  return NextResponse.json({ ok: true, user_id_hash });
}
