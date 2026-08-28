import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isChildOfParent } from '@/lib/parent-store';
import { redis } from '@/lib/redis';

/**
 * DELETE /api/violations/[user_id_hash]/[incident_id]
 *
 * "Mark Reviewed" - permanently removes the referenced incident from the
 * child's violations list so it no longer appears on the parent dashboard.
 *
 * Auth: Supabase parent session + isChildOfParent membership check.
 * Storage: Redis LREM against violations:{user_id_hash} matching the JSON
 *          record whose "id" field equals incident_id.
 */
export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: { user_id_hash: string; incident_id: string };
  },
) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hash = params.user_id_hash;
  const incidentId = params.incident_id;
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    return NextResponse.json({ error: 'Invalid user_id_hash' }, { status: 400 });
  }
  if (!incidentId || incidentId.length > 128) {
    return NextResponse.json({ error: 'Invalid incident_id' }, { status: 400 });
  }

  // Membership: parent can only mark incidents on children they own.
  const owned = await isChildOfParent(user.id, hash);
  if (!owned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // The Incident.id shown in the UI is derived at read-time from the
  // fields inside the JSON blob (see lib/insights-server.ts:210):
  //     id = `${user_id_hash}:${session_id}:${timestamp}:${index}`
  // We reconstruct it the same way, then LREM the matching raw entry.
  const key = `violations:${hash}`;
  const items = await redis.lrange(key, 0, -1);
  let removed = 0;
  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    try {
      const v = JSON.parse(raw) as {
        user_id_hash?: string;
        session_id?: string;
        timestamp?: string;
      };
      if (!v || !v.user_id_hash || !v.session_id || !v.timestamp) continue;
      const derivedId = `${v.user_id_hash}:${v.session_id}:${v.timestamp}:${i}`;
      if (derivedId === incidentId) {
        const n = await redis.lrem(key, 0, raw);
        removed += n;
        break; // only one match by index
      }
    } catch {
      // ignore malformed entries
    }
  }

  return NextResponse.json({ ok: true, removed });
}
