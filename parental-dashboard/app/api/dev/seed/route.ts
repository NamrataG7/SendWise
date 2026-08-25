/**
 * POST /api/dev/seed
 *
 * Development / demo seeder: pre-populates a parent account with a demo child
 * and realistic-looking violations so a fresh Vercel deploy renders a working
 * Fig 3 dashboard out of the box (paper reproducibility).
 *
 * SECURITY:
 *   - Requires header `x-seed-token` matching env `SEED_TOKEN`.
 *   - Returns 404 in production unless `ALLOW_SEED === 'true'` (belt-and-
 *     suspenders on top of the token check).
 *   - Middleware bypasses NextAuth for /api/dev/* — token is the only gate.
 *
 * Body:
 *   {
 *     parent_email: string,           // required
 *     child_name?: string,            // optional label, not stored on the record
 *     num_violations?: number = 40,
 *     days_range?: number = 30
 *   }
 *
 * Response:
 *   { ok: true, user_id_hash, seeded, parent, child }
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  computeChildHash,
  generateViolations,
} from '@/scripts/generate-seed-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIST_CAP = 1000;
const DEFAULT_COUNT = 40;
const DEFAULT_DAYS = 30;
const MAX_COUNT = 500;
const MAX_DAYS = 365;

function isProdBlocked(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true';
}

export async function POST(req: NextRequest) {
  // Belt-and-suspenders: hide entirely in prod unless explicitly allowed.
  if (isProdBlocked()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const expected = process.env.SEED_TOKEN;
  const provided = req.headers.get('x-seed-token');
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    parent_email?: unknown;
    child_name?: unknown;
    num_violations?: unknown;
    days_range?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parentEmailRaw = typeof body.parent_email === 'string' ? body.parent_email : '';
  const parentEmail = parentEmailRaw.trim().toLowerCase();
  if (!parentEmail || !parentEmail.includes('@')) {
    return NextResponse.json(
      { error: 'parent_email required (must look like an email)' },
      { status: 400 },
    );
  }

  const childName =
    typeof body.child_name === 'string' && body.child_name.trim().length > 0
      ? body.child_name.trim()
      : 'Demo Child';

  const numViolations = clampInt(body.num_violations, DEFAULT_COUNT, 1, MAX_COUNT);
  const daysRange = clampInt(body.days_range, DEFAULT_DAYS, 1, MAX_DAYS);

  const userIdHash = computeChildHash(parentEmail);

  // Link child to parent (matches /api/pairing/redeem key convention).
  await redis.sadd(`parent:${parentEmail}:children`, userIdHash);

  // Wipe any prior demo data for this child so repeated calls are idempotent.
  await redis.del(`violations:${userIdHash}`);

  const violations = generateViolations({
    userIdHash,
    count: numViolations,
    daysRange,
    seed: `${parentEmail}:${childName}:${numViolations}:${daysRange}`,
  });

  // LPUSH oldest→newest so the newest ends up at index 0 (matches real ingest).
  // generateViolations() returns newest-first; reverse before pushing.
  const oldestFirst = [...violations].reverse();
  if (oldestFirst.length > 0) {
    const payloads = oldestFirst.map((v) => JSON.stringify(v));
    // ioredis supports variadic lpush; the in-memory stub does too.
    await redis.lpush(`violations:${userIdHash}`, ...payloads);
    await redis.ltrim(`violations:${userIdHash}`, 0, LIST_CAP - 1);
  }

  return NextResponse.json({
    ok: true,
    user_id_hash: userIdHash,
    seeded: violations.length,
    parent: parentEmail,
    child: childName,
  });
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
