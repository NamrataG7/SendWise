/**
 * Insights aggregates for Fig 3 (Behavioral Insights).
 *
 * Derives chart-ready aggregates from sample-data. Percentages in the
 * category / severity / edited-vs-sent donuts match the paper's Fig 3
 * mock exactly so the reproduction is faithful even with a small sample.
 * The 30-day trend uses the 5 fixed date points from the spec.
 */

import { sampleStats } from './sample-data';

export interface TrendPoint {
  date: string;
  interventions: number;
}

export interface DonutSlice {
  name: string;
  value: number; // percentage (0-100)
  color: string;
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
