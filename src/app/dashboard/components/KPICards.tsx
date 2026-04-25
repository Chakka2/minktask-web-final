'use client';

import React from 'react';
import { Users, MousePointer, IndianRupee, Calendar } from 'lucide-react';
import { useUserSummary } from '@/contexts/UserSummaryContext';

export default function KPICards() {
  const { summary, loading } = useUserSummary();

  const KPI_DATA = [
    {
      id: 'kpi-total-earned',
      label: 'Total earnings',
      value: loading ? '…' : `₹${summary.totalLifetimeCredits.toFixed(2)}`,
      sub: 'All rewards combined',
      icon: IndianRupee,
      iconBg: 'rgba(59,130,246,0.15)',
      iconColor: '#60a5fa',
    },
    {
      id: 'kpi-this-month',
      label: 'This month',
      value: loading ? '…' : `₹${summary.thisMonthCredits.toFixed(2)}`,
      sub: 'IST calendar month',
      icon: Calendar,
      iconBg: 'rgba(251,191,36,0.12)',
      iconColor: '#fbbf24',
    },
    {
      id: 'kpi-referrals',
      label: 'People you referred',
      value: loading ? '…' : String(summary.referralCount),
      sub: 'Joined with your link',
      icon: Users,
      iconBg: 'rgba(99,102,241,0.15)',
      iconColor: '#818cf8',
    },
    {
      id: 'kpi-sales',
      label: 'Sales from your link',
      value: loading ? '…' : String(summary.bundleReferralSales),
      sub: 'Qualifying activity',
      icon: MousePointer,
      iconBg: 'rgba(34,211,238,0.12)',
      iconColor: '#22d3ee',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {KPI_DATA?.map((kpi) => {
        const Icon = kpi?.icon;
        return (
          <div key={kpi?.id} className="glass-card-hover p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi?.iconBg }}>
                <Icon size={18} style={{ color: kpi?.iconColor }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white font-mono tabular-nums mb-1">{kpi?.value}</p>
            <p className="text-xs font-medium text-white/50">{kpi?.label}</p>
            <p className="text-[10px] text-white/35 mt-1">{kpi?.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
