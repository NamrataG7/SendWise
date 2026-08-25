'use client';

import InterventionTrendCard from './InterventionTrendCard';
import CategoryDistributionCard from './CategoryDistributionCard';
import SeverityDistributionCard from './SeverityDistributionCard';
import EditedVsSentCard from './EditedVsSentCard';

export default function InsightsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InterventionTrendCard />
      <CategoryDistributionCard />
      <SeverityDistributionCard />
      <EditedVsSentCard />
    </div>
  );
}
