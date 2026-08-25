/**
 * Parent → children lookup.
 *
 * Backed by Redis set `parent:{parent_id}:children` (populated by
 * /api/pairing/redeem). Server-only: relies on the redis singleton.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    '[parent-store] This module is server-only and must not be imported from client components.',
  );
}

import { redis } from '@/lib/redis';

/**
 * Normalise the parent identifier used as the Redis set key.
 * We store by lowercased email to match how NextAuth `authorize()` compares.
 */
function parentKey(parentId: string): string {
  return `parent:${parentId.trim().toLowerCase()}:children`;
}

/**
 * Return the list of user_id_hashes linked to the given parent.
 * Empty array when the parent has no linked children.
 *
 * Checks both the lowercased and raw email forms because
 * /api/pairing/redeem currently writes `parent:{parent_id}:children`
 * without normalising, while NextAuth compares email case-insensitively.
 */
export async function getChildrenForParent(parentId: string): Promise<string[]> {
  if (!parentId) return [];
  const lowered = parentId.trim().toLowerCase();
  const raw = parentId.trim();
  const keys = raw === lowered ? [parentKey(parentId)] : [
    parentKey(parentId),
    `parent:${raw}:children`,
  ];
  const results = await Promise.all(keys.map((k) => redis.smembers(k)));
  const merged = new Set<string>();
  for (const arr of results) for (const m of arr) merged.add(m);
  // Defensive: only return well-formed user_id_hashes.
  return Array.from(merged).filter((m) => /^[a-f0-9]{64}$/i.test(m));
}
