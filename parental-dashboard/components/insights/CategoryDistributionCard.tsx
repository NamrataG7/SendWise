'use client';

import DonutCard from './DonutCard';
import { getCategoryDistribution } from '@/lib/insights-aggregates';
import type { DonutSlice } from '@/lib/insights-aggregates';

export default function CategoryDistributionCard({ slices }: { slices?: DonutSlice[] } = {}) {
  return (
    <DonutCard title="Category Distribution" slices={slices ?? getCategoryDistribution()} />
  );
}
