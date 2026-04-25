import React from 'react';
import AppLayout from '@/components/AppLayout';
import WalletHeroCard from './components/WalletHeroCard';
import RecentTransactions from './components/RecentTransactions';
import QuickActions from './components/QuickActions';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-5 pb-20 lg:pb-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-white/50 mt-0.5">Simple overview of your account</p>
          </div>
          <span className="text-xs text-white/30 font-mono">Fast view</span>
        </div>

        <WalletHeroCard />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <QuickActions />
          <RecentTransactions />
        </div>
      </div>
    </AppLayout>
  );
}
