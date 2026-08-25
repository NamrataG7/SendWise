import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type {
  IncidentCategoryT,
  SeverityT,
  ActionT,
} from '@/lib/schema';

export const runtime = 'nodejs';

interface StoredViolation {
  user_id_hash: string;
  timestamp: string;
  category: IncidentCategoryT;
  severity: SeverityT;
  action: ActionT;
  session_id: string;
}

interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

interface InsightsPayload {
  user_id_hash: string;
  total: number;
  trend: TrendPoint[];
  categoryDistribution: Record<IncidentCategoryT, number>;
  severityDistribution: Record<SeverityT, number>;
  editedVsSent: { edited: number; sent_anyway: number };
}

const CATEGORIES: IncidentCategoryT[] = [
  'self_harm',
  'privacy_risk',
  'risky_behavior',
  'meeting_stranger',
  'cyberbullying',
];
const SEVERITIES: SeverityT[] = ['low', 'medium', 'high'];

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// TODO(phase-2): require parent auth + confirm parent owns this user_id_hash.
export async function GET(
  _req: NextRequest,
  { params }: { params: { user_id_hash: string } },
) {
  const { user_id_hash } = params;
  if (!/^[a-f0-9]{64}$/i.test(user_id_hash)) {
    return NextResponse.json({ error: 'Invalid user_id_hash' }, { status: 400 });
  }

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

  // 30-day trend, oldest -> newest, zero-filled.
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

  const trend: TrendPoint[] = Array.from(trendMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const payload: InsightsPayload = {
    user_id_hash,
    total: violations.length,
    trend,
    categoryDistribution,
    severityDistribution,
    editedVsSent,
  };

  return NextResponse.json(payload);
}
