import React from 'react';
import AppLayout from '@/components/AppLayout';
import EarningsSummaryCards from './components/EarningsSummaryCards';
import EarningsBreakdownChart from './components/EarningsBreakdownChart';
import EarningsSourceBreakdown from './components/EarningsSourceBreakdown';
import TransactionHistoryTable from './components/TransactionHistoryTable';

export default function EarningsPage() {
  return (
    <AppLayout>
      <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-sm text-white/40 mt-0.5">One wallet — all rewards shown the same way</p>
        </div>

        <EarningsSummaryCards />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <EarningsBreakdownChart />
          </div>
          <div>
            <EarningsSourceBreakdown />
          </div>
        </div>

        <TransactionHistoryTable />
      </div>
    </AppLayout>
  );
}