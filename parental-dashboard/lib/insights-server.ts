/**
 * Server-only insights aggregation.
 *
 * Shared by:
 *   - GET /api/insights/[user_id_hash]  (HTTP)
 *   - /insights server component        (direct call, no round-trip)
 *
 * NOTE: We would normally use `import 'server-only'` here, but that package
 * is not a declared dependency in this workspace. We enforce the same
 * invariant at runtime with a window guard so accidental client imports
 * fail loudly instead of silently shipping Redis code to the browser.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    '[insights-server] This module is server-only and must not be imported from client components.',
  );
}

import { redis } from '@/lib/redis';
import type { IncidentCategoryT, SeverityT, ActionT } from '@/lib/schema';
import type {
  InsightsPayload,
  InsightsTrendPoint,
} from '@/lib/insights-server-types';

export type {
  InsightsPayload,
  InsightsTrendPoint as TrendPoint,
} from '@/lib/insights-server-types';

interface StoredViolation {
  user_id_hash: string;
  timestamp: string;
  category: IncidentCategoryT;
  severity: SeverityT;
  action: ActionT;
  session_id: string;
}

const CATEGORIES: IncidentCategoryT[] = [
  'harassment',
  'threats',
  'hate_speech',
  'sexual_content',
  'self_harm',
];
const SEVERITIES: SeverityT[] = ['low', 'medium', 'high'];

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Compute the 30-day insights payload for a single user_id_hash.
 * Same shape returned by GET /api/insights/[user_id_hash].
 */
export async function computeInsights(user_id_hash: string): Promise<InsightsPayload> {
  const raw = await redis.lrange(`violations:${user_id_hash}`, 0, -1);
  const violations: StoredViolation[] = raw
    .map((s) => {
      try {
        return JSON.parse(s) as StoredViolation;
      } catch {
        return null;
      }
    })
    .filter((v): v is StoredViolation => v !== null);

  const now = new Date();
  const trendMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    trendMap.set(dayKey(d), 0);
  }
  const cutoffMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const categoryDistribution = Object.fromEntries(
    CATEGORIES.map((c) => [c, 0]),
  ) as Record<IncidentCategoryT, number>;
  const severityDistribution = Object.fromEntries(
    SEVERITIES.map((s) => [s, 0]),
  ) as Record<SeverityT, number>;
  const editedVsSent = { edited: 0, sent_anyway: 0 };

  for (const v of violations) {
    const t = Date.parse(v.timestamp);
    if (!Number.isNaN(t) && t >= cutoffMs) {
      const key = dayKey(new Date(t));
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    if (v.category in categoryDistribution) categoryDistribution[v.category] += 1;
    if (v.severity in severityDistribution) severityDistribution[v.severity] += 1;
    if (v.action === 'edited') editedVsSent.edited += 1;
    else if (v.action === 'sent_anyway') editedVsSent.sent_anyway += 1;
  }

  const trend: InsightsTrendPoint[] = Array.from(trendMap.entries()).map(
    ([date, count]) => ({ date, count }),
  );

  return {
    user_id_hash,
    total: violations.length,
    trend,
    categoryDistribution,
    severityDistribution,
    editedVsSent,
  };
}

/**
 * Aggregate insights across many children by summing counts and merging
 * daily trend points. Categories, severities, and edited/sent tallies are
 * summed; trend is aligned by ISO date key.
 */
export async function computeInsightsAggregate(
  user_id_hashes: string[],
): Promise<InsightsPayload> {
  if (user_id_hashes.length === 1) return computeInsights(user_id_hashes[0]);

  const parts = await Promise.all(user_id_hashes.map(computeInsights));

  const trendMap = new Map<string, number>();
  const categoryDistribution = Object.fromEntries(
    CATEGORIES.map((c) => [c, 0]),
  ) as Record<IncidentCategoryT, number>;
  const severityDistribution = Object.fromEntries(
    SEVERITIES.map((s) => [s, 0]),
  ) as Record<SeverityT, number>;
  const editedVsSent = { edited: 0, sent_anyway: 0 };
  let total = 0;

  for (const p of parts) {
    total += p.total;
    for (const pt of p.trend) {
      trendMap.set(pt.date, (trendMap.get(pt.date) ?? 0) + pt.count);
    }
    for (const c of CATEGORIES) categoryDistribution[c] += p.categoryDistribution[c] ?? 0;
    for (const s of SEVERITIES) severityDistribution[s] += p.severityDistribution[s] ?? 0;
    editedVsSent.edited += p.editedVsSent.edited;
    editedVsSent.sent_anyway += p.editedVsSent.sent_anyway;
  }

  const trend: InsightsTrendPoint[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, count]) => ({ date, count }));

  return {
    user_id_hash: user_id_hashes.join(','),
    total,
    trend,
    categoryDistribution,
    severityDistribution,
    editedVsSent,
  };
}
