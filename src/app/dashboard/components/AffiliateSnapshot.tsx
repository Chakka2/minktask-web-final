'use client';

import React from 'react';
import Link from 'next/link';
import { IndianRupee, Users, MousePointer, ArrowRight } from 'lucide-react';
import { useUserSummary } from '@/contexts/UserSummaryContext';

export default function AffiliateSnapshot() {
  const { summary, loading } = useUserSummary();

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Earnings snapshot</h3>
        <Link href="/referral-page" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          Invite <ArrowRight size={12} />
        </Link>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
          <IndianRupee size={18} className="text-indigo-300" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">
            {loading ? '…' : `₹${summary.totalLifetimeCredits.toFixed(2)}`}
          </p>
          <p className="text-xs text-white/40">Total credited (same wallet everywhere)</p>
        </div>
      </div>
      <div className="space-y-3">
        {[
          {
            label: 'This month (all sources)',
            value: loading ? '…' : `₹${summary.thisMonthCredits.toFixed(2)}`,
            color: '#a5b4fc',
            icon: IndianRupee,
          },
          {
            label: 'People you referred',
            value: loading ? '…' : summary.referralCount.toLocaleString('en-IN'),
            color: '#818cf8',
            icon: Users,
          },
          {
            label: 'Sales from your link',
            value: loading ? '…' : summary.bundleReferralSales.toLocaleString('en-IN'),
            color: '#22d3ee',
            icon: MousePointer,
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/50 flex items-center gap-2">
              <item.icon size={14} className="text-white/35 shrink-0" />
              {item.label}
            </span>
            <span className="text-sm font-semibold font-mono tabular-nums shrink-0" style={{ color: item.color }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
