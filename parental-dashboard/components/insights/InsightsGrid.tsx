'use client';

import InterventionTrendCard from './InterventionTrendCard';
import CategoryDistributionCard from './CategoryDistributionCard';
import SeverityDistributionCard from './SeverityDistributionCard';
import EditedVsSentCard from './EditedVsSentCard';
import type { TrendPoint, DonutSlice } from '@/lib/insights-aggregates';

export interface InsightsGridProps {
  trend?: TrendPoint[];
  categoryDistribution?: DonutSlice[];
  severityDistribution?: DonutSlice[];
  editedVsSent?: DonutSlice[];
}

export default function InsightsGrid({
  trend,
  categoryDistribution,
  severityDistribution,
  editedVsSent,
}: InsightsGridProps = {}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InterventionTrendCard data={trend} />
      <CategoryDistributionCard slices={categoryDistribution} />
      <SeverityDistributionCard slices={severityDistribution} />
      <EditedVsSentCard slices={editedVsSent} />
    </div>
  );
}
