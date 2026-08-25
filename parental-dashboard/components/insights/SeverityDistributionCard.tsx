'use client';

import DonutCard from './DonutCard';
import { getSeverityDistribution } from '@/lib/insights-aggregates';

export default function SeverityDistributionCard() {
  return (
    <DonutCard title="Severity Distribution" slices={getSeverityDistribution()} />
  );
}
