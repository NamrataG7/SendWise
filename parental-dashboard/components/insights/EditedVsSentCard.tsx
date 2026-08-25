'use client';

import DonutCard from './DonutCard';
import { getEditedVsSent } from '@/lib/insights-aggregates';

export default function EditedVsSentCard() {
  return (
    <DonutCard title="Edited vs Sent Unchanged" slices={getEditedVsSent()} />
  );
}
