'use client';

import React, { useMemo } from 'react';
import { useUserSummary } from '@/contexts/UserSummaryContext';

export default function EarningsSourceBreakdown() {
  const { summary, loading } = useUserSummary();

  const total = useMemo(
    () => summary.referralEarnings + summary.bundleEarnings + summary.bonusEarnings,
    [summary.referralEarnings, summary.bundleEarnings, summary.bonusEarnings]
  );

  return (
    <div className="glass-card p-5 h-full">
      <h3 className="text-base font-semibold text-white mb-3">Your earnings</h3>
      <p className="text-xs text-white/45 leading-relaxed mb-5">
        Referral rewards and link-based rewards are combined into one wallet. We no longer split them as different “types” of money on this screen.
      </p>
      {loading && <p className="text-sm text-white/40">Loading…</p>}
      {!loading && (
        <div className="space-y-3">
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full w-full bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-90" />
          </div>
          <p className="text-xs text-white/35">100% of credited rewards count toward the same balance.</p>
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-white/8 flex items-center justify-between">
        <span className="text-xs text-white/50">Total credited</span>
        <span className="text-lg font-bold text-white font-mono tabular-nums">
          {loading ? '…' : `₹${total.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
