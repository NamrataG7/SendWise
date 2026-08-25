import { NextRequest, NextResponse } from 'next/server';
import { computeInsights } from '@/lib/insights-server';

export const runtime = 'nodejs';

// TODO(phase-2): require parent auth + confirm parent owns this user_id_hash.
export async function GET(
  _req: NextRequest,
  { params }: { params: { user_id_hash: string } },
) {
  const { user_id_hash } = params;
  if (!/^[a-f0-9]{64}$/i.test(user_id_hash)) {
    return NextResponse.json({ error: 'Invalid user_id_hash' }, { status: 400 });
  }

  const payload = await computeInsights(user_id_hash);
  return NextResponse.json(payload);
}
