import React from 'react';
import AppLayout from '@/components/AppLayout';
import WithdrawBalanceCard from './components/WithdrawBalanceCard';
import WithdrawForm from './components/WithdrawForm';
import WithdrawHistory from './components/WithdrawHistory';
import WithdrawRules from './components/WithdrawRules';

export default function WithdrawPage() {
  return (
    <AppLayout>
      <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Withdraw</h1>
          <p className="text-sm text-white/40 mt-0.5">Transfer your earnings to your UPI account</p>
        </div>

        <WithdrawBalanceCard />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <WithdrawForm />
            <WithdrawHistory />
          </div>
          <div>
            <WithdrawRules />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}