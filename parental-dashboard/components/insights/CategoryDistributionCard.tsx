'use client';

import DonutCard from './DonutCard';
import { getCategoryDistribution } from '@/lib/insights-aggregates';

export default function CategoryDistributionCard() {
  return (
    <DonutCard title="Category Distribution" slices={getCategoryDistribution()} />
  );
}
