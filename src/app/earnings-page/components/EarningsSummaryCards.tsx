'use client';

import React from 'react';
import { IndianRupee, Users, MousePointer, Calendar } from 'lucide-react';
import { useUserSummary } from '@/contexts/UserSummaryContext';

export default function EarningsSummaryCards() {
  const { summary, loading } = useUserSummary();
  const total = summary.totalLifetimeCredits;
  const month = summary.thisMonthCredits;

  const SUMMARY = [
    {
      id: 'es-total',
      label: 'Total earnings',
      value: loading ? '…' : `₹${total.toFixed(2)}`,
      sub: loading ? '…' : total > 0 ? 'All referral & activity rewards in one balance' : 'No earnings recorded yet',
      icon: IndianRupee,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.15)',
    },
    {
      id: 'es-this-month',
      label: 'This month',
      value: loading ? '…' : `₹${month.toFixed(2)}`,
      sub: 'Current month (IST)',
      icon: Calendar,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.12)',
    },
    {
      id: 'es-referrals',
      label: 'Your referrals',
      value: loading ? '…' : String(summary.referralCount),
      sub: 'People who joined with your link',
      icon: Users,
      color: '#818cf8',
      bg: 'rgba(129,140,248,0.12)',
    },
    {
      id: 'es-sales',
      label: 'Sales from your link',
      value: loading ? '…' : String(summary.bundleReferralSales),
      sub: 'Tracked qualifying sales',
      icon: MousePointer,
      color: '#22d3ee',
      bg: 'rgba(34,211,238,0.12)',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {SUMMARY?.map((card) => {
        const Icon = card?.icon;
        return (
          <div key={card?.id} className="glass-card-hover p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: card?.bg }}>
              <Icon size={18} style={{ color: card?.color }} />
            </div>
            <p className="text-2xl font-bold text-white font-mono tabular-nums mb-1">{card?.value}</p>
            <p className="text-xs font-medium text-white/50 mb-0.5">{card?.label}</p>
            <p className="text-xs text-white/30">{card?.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
