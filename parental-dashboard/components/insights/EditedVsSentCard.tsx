'use client';

import DonutCard from './DonutCard';
import { getEditedVsSent } from '@/lib/insights-aggregates';
import type { DonutSlice } from '@/lib/insights-aggregates';

export default function EditedVsSentCard({ slices }: { slices?: DonutSlice[] } = {}) {
  return (
    <DonutCard title="Edited vs Sent Unchanged" slices={slices ?? getEditedVsSent()} />
  );
}
