'use client';

import React from 'react';
import { IndianRupee, Clock, CheckCircle } from 'lucide-react';
import { useUserSummary } from '@/contexts/UserSummaryContext';
import { getWithdrawRequestMinimum } from '@/lib/constants';

export default function WithdrawBalanceCard() {
  const { summary, loading } = useUserSummary();
  const available = summary.walletBalance;
  const pending = summary.pendingWithdrawal;
  const totalWithdrawn = summary.totalWithdrawn;
  const count = summary.paidWithdrawalCount;
  const minNeed = getWithdrawRequestMinimum(count, available);
  const isEligible = available >= minNeed;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 relative overflow-hidden rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
          border: isEligible ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(99,102,241,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none" style={{ background: '#6366f1' }} />
        <p className="text-xs font-medium text-white/60 mb-3">Available Balance</p>
        <p className="text-4xl font-bold text-white font-mono tabular-nums flex items-center gap-1">
          <IndianRupee size={22} />
          {loading ? '…' : available.toFixed(2)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          {loading ? null : isEligible ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
              <CheckCircle size={13} />
              Eligible to withdraw
            </span>
          ) : (
            <span className="text-xs text-yellow-400">
              Need ₹{Math.max(0, minNeed - available).toFixed(2)} more to withdraw (min ₹{minNeed.toFixed(2)})
            </span>
          )}
        </div>
      </div>
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)' }}>
          <Clock size={20} className="text-yellow-400" />
        </div>
        <div>
          <p className="text-xs text-white/50 mb-1">Pending Withdrawal</p>
          <p className="text-2xl font-bold text-yellow-400 font-mono tabular-nums">
            ₹{loading ? '…' : pending.toFixed(2)}
          </p>
          <p className="text-xs text-white/30">Processing within 24h</p>
        </div>
      </div>
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
          <CheckCircle size={20} className="text-green-400" />
        </div>
        <div>
          <p className="text-xs text-white/50 mb-1">Total Withdrawn</p>
          <p className="text-2xl font-bold text-green-400 font-mono tabular-nums">
            ₹{loading ? '…' : totalWithdrawn.toFixed(2)}
          </p>
          <p className="text-xs text-white/30">
            {loading ? '…' : `${count} completed payout${count === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>
    </div>
  );
}
