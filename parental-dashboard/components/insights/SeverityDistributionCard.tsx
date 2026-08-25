'use client';

import DonutCard from './DonutCard';
import { getSeverityDistribution } from '@/lib/insights-aggregates';
import type { DonutSlice } from '@/lib/insights-aggregates';

export default function SeverityDistributionCard({ slices }: { slices?: DonutSlice[] } = {}) {
  return (
    <DonutCard title="Severity Distribution" slices={slices ?? getSeverityDistribution()} />
  );
}
