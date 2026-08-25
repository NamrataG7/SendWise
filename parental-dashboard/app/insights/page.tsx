import Link from 'next/link';
import InsightsGrid from '@/components/insights/InsightsGrid';

export const metadata = {
  title: 'Behavioral Insights (Fig 3) — SendWise',
  description:
    'Aggregated behavioral risk indicators from the SendWise parental dashboard.',
};

export default function InsightsPage() {
  return (
    <div className="bg-[#F7F8FB] min-h-screen text-[#101532]">
      {/* Header bar */}
      <header className="w-full bg-white border-b border-[#ECEEF3] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: '#6C3FE1' }}
            aria-hidden="true"
          >
            S
          </div>
          <div className="leading-tight">
            <div className="text-[22px] font-bold text-[#101532]">SendWise</div>
            <div className="text-[14px] text-[#6B7280]">Parental Dashboard</div>
          </div>
        </div>
        <Link
          href="/"
          className="text-[14px] font-medium text-[#6C3FE1] hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </header>

      {/* Main */}
      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[28px] font-extrabold text-[#101532]">
            Behavioral Insights (Fig 3)
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1">
            Aggregated behavioral risk indicators. No message content is ever
            displayed.
          </p>
        </div>

        <InsightsGrid />

        <p className="text-[12px] text-[#6B7280] mt-8">
          Aggregated indicators only. No message content is shown or stored on
          this dashboard.
        </p>
      </main>
    </div>
  );
}
