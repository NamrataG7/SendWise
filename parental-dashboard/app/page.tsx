'use client';

import { useState, useMemo } from 'react';
import IncidentCard from '@/components/IncidentCard';
import StatsOverview from '@/components/StatsOverview';
import CategoryFilter from '@/components/CategoryFilter';
import { sampleChild, sampleIncidents, sampleStats } from '@/lib/sample-data';
import { IncidentCategory } from '@/lib/types';

export default function Dashboard() {
  const [selectedCategories, setSelectedCategories] = useState<IncidentCategory[]>([
    'self_harm',
    'privacy_risk',
    'meeting_stranger',
    'risky_behavior',
    'cyberbullying'
  ]);

  const handleCategoryToggle = (category: IncidentCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleExportReport = () => {
    // Generate CSV report
    const headers = ['Timestamp', 'Platform', 'Category', 'Severity', 'Detected Text', 'Action', 'Recommendation'];
    const rows = filteredIncidents.map(inc => [
      new Date(inc.timestamp).toLocaleString(),
      inc.platform,
      inc.category,
      inc.severity,
      inc.detectedText,
      inc.action,
      inc.recommendation
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sendwise-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredIncidents = useMemo(() => {
    return sampleIncidents.filter(inc =>
      selectedCategories.includes(inc.category)
    );
  }, [selectedCategories]);

  const criticalIncidents = filteredIncidents.filter(inc =>
    inc.severity === 'urgent' || inc.severity === 'critical'
  );

  const otherIncidents = filteredIncidents.filter(inc =>
    inc.severity !== 'urgent' && inc.severity !== 'critical'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SendWise</h1>
              <p className="text-sm text-gray-600">Parental Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Child</p>
                <p className="font-semibold">{sampleChild.name} ({sampleChild.age})</p>
              </div>
              <button
                onClick={handleExportReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                📥 Export Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <StatsOverview stats={sampleStats} />

        {/* Alert Banner for Critical Incidents */}
        {criticalIncidents.length > 0 && (
          <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚨</span>
              <div>
                <p className="font-bold text-red-900">
                  {criticalIncidents.length} Critical Alert{criticalIncidents.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700">
                  Requires immediate attention
                </p>
              </div>
            </div>
            <button className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
              Review Now
            </button>
          </div>
        )}

        {/* Category Filter */}
        <CategoryFilter
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
        />

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
            {selectedCategories.length < 5 && ' (filtered)'}
          </p>
        </div>

        {/* Critical Incidents Section */}
        {criticalIncidents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🚨 Critical Incidents
            </h2>
            {criticalIncidents.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}

        {/* Other Incidents */}
        {otherIncidents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Recent Activity
            </h2>
            {otherIncidents.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredIncidents.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">✅</span>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              No Incidents Found
            </h3>
            <p className="text-gray-600">
              {selectedCategories.length === 5
                ? 'Great news! No safety concerns detected recently.'
                : 'Try adjusting your filters to see more incidents.'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>SendWise Parental Dashboard v1.0</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-blue-600">Privacy Policy</a>
              <a href="#" className="hover:text-blue-600">Terms of Service</a>
              <a href="#" className="hover:text-blue-600">Get Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
