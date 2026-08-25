/**
 * Insights aggregates for Fig 3 (Behavioral Insights).
 *
 * Derives chart-ready aggregates from sample-data. Percentages in the
 * category / severity / edited-vs-sent donuts match the paper's Fig 3
 * mock exactly so the reproduction is faithful even with a small sample.
 * The 30-day trend uses the 5 fixed date points from the spec.
 */

import { sampleStats } from './sample-data';
import type { InsightsPayload } from './insights-server-types';

export interface TrendPoint {
  date: string;
  interventions: number;
}

export interface DonutSlice {
  name: string;
  value: number; // percentage (0-100)
  color: string;
}

export interface InsightsChartData {
  trend: TrendPoint[];
  categoryDistribution: DonutSlice[];
  severityDistribution: DonutSlice[];
  editedVsSent: DonutSlice[];
}

export const TOTAL_INTERVENTIONS: number = sampleStats.totalIncidents ?? 80;

export function getInterventionTrend(): TrendPoint[] {
  // Fixed 5 points per DESIGN_SPEC_FROM_PAPER §3.2
  return [
    { date: '20 July', interventions: 10 },
    { date: '27 July', interventions: 18 },
    { date: '3 August', interventions: 26 },
    { date: '10 August', interventions: 38 },
    { date: '20 August', interventions: 21 },
  ];
}

export function getCategoryDistribution(): DonutSlice[] {
  return [
    { name: 'Self-Harm Risk', value: 45, color: '#E5484D' },
    { name: 'Stranger Contact', value: 25, color: '#F59B2A' },
    { name: 'Cyberbullying', value: 20, color: '#7C5CD6' },
    { name: 'Privacy Risk', value: 10, color: '#2F6BFF' },
  ];
}

export function getSeverityDistribution(): DonutSlice[] {
  return [
    { name: 'High', value: 25, color: '#E5484D' },
    { name: 'Medium', value: 50, color: '#F59B2A' },
    { name: 'Low', value: 25, color: '#2AAE6B' },
  ];
}

export function getEditedVsSent(): DonutSlice[] {
  return [
    { name: 'Edited Before Sending', value: 60, color: '#2AAE6B' },
    { name: 'Sent Unchanged', value: 40, color: '#2F6BFF' },
  ];
}

// ---------------------------------------------------------------------------
// Live-data helpers (client-safe: no redis/server imports)
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  self_harm: { label: 'Self-Harm Risk', color: '#E5484D' },
  meeting_stranger: { label: 'Stranger Contact', color: '#F59B2A' },
  cyberbullying: { label: 'Cyberbullying', color: '#7C5CD6' },
  privacy_risk: { label: 'Privacy Risk', color: '#2F6BFF' },
  risky_behavior: { label: 'Risky Behavior', color: '#B08CFF' },
};

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  high: { label: 'High', color: '#E5484D' },
  medium: { label: 'Medium', color: '#F59B2A' },
  low: { label: 'Low', color: '#2AAE6B' },
};

function toPercentSlices(
  counts: Record<string, number>,
  meta: Record<string, { label: string; color: string }>,
): DonutSlice[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const order = Object.keys(meta);
  if (total === 0) {
    return order.map((k) => ({ name: meta[k].label, value: 0, color: meta[k].color }));
  }
  return order.map((k) => ({
    name: meta[k].label,
    value: Math.round(((counts[k] ?? 0) / total) * 100),
    color: meta[k].color,
  }));
}

function formatDayLabel(iso: string): string {
  // "2025-08-20" -> "20 Aug"
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/**
 * Convert the server-side InsightsPayload to the chart-ready shape used by
 * the client components in components/insights/*.
 */
export function payloadToChartData(payload: InsightsPayload): InsightsChartData {
  const trend: TrendPoint[] = payload.trend.map((p) => ({
    date: formatDayLabel(p.date),
    interventions: p.count,
  }));

  const categoryDistribution = toPercentSlices(
    payload.categoryDistribution as unknown as Record<string, number>,
    CATEGORY_META,
  );
  const severityDistribution = toPercentSlices(
    payload.severityDistribution as unknown as Record<string, number>,
    SEVERITY_META,
  );

  const editedTotal = payload.editedVsSent.edited + payload.editedVsSent.sent_anyway;
  const editedPct = editedTotal === 0 ? 0 : Math.round((payload.editedVsSent.edited / editedTotal) * 100);
  const sentPct = editedTotal === 0 ? 0 : 100 - editedPct;
  const editedVsSent: DonutSlice[] = [
    { name: 'Edited Before Sending', value: editedPct, color: '#2AAE6B' },
    { name: 'Sent Unchanged', value: sentPct, color: '#2F6BFF' },
  ];

  return { trend, categoryDistribution, severityDistribution, editedVsSent };
}

/**
 * Zero-filled chart data for the empty state (parent has no linked children).
 * Preserves the visual layout (labels + colors) so the page never shows a
 * jarring blank grid.
 */
export function emptyInsights(): InsightsChartData {
  const now = new Date();
  const trend: TrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    trend.push({
      date: formatDayLabel(d.toISOString().slice(0, 10)),
      interventions: 0,
    });
  }
  return {
    trend,
    categoryDistribution: Object.keys(CATEGORY_META).map((k) => ({
      name: CATEGORY_META[k].label,
      value: 0,
      color: CATEGORY_META[k].color,
    })),
    severityDistribution: Object.keys(SEVERITY_META).map((k) => ({
      name: SEVERITY_META[k].label,
      value: 0,
      color: SEVERITY_META[k].color,
    })),
    editedVsSent: [
      { name: 'Edited Before Sending', value: 0, color: '#2AAE6B' },
      { name: 'Sent Unchanged', value: 0, color: '#2F6BFF' },
    ],
  };
}
