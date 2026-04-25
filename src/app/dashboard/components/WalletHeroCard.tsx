'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { IndianRupee, Eye, EyeOff, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useUserSummary } from '@/contexts/UserSummaryContext';
import { WITHDRAW_MIN, getWithdrawRequestMinimum } from '@/lib/constants';

export default function WalletHeroCard() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const { summary, loading } = useUserSummary();
  const balance = summary.walletBalance;
  const today = summary.todayCredits;
  const lifetime = summary.totalLifetimeCredits;
  const minWithdraw = getWithdrawRequestMinimum(summary.paidWithdrawalCount, balance);
  const progressTarget = summary.paidWithdrawalCount === 0 ? WITHDRAW_MIN : Math.max(minWithdraw, 0.01);
  const progressPct = Math.min(100, (balance / progressTarget) * 100);
  const needMore = Math.max(0, minWithdraw - balance);

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8"
      style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.25) 50%, rgba(139,92,246,0.2) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
      }}>
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-medium text-white/60">Available Wallet Balance</p>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Toggle balance visibility"
            >
              {balanceVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <div className="flex items-end gap-3 mb-2">
            <p className="text-4xl md:text-5xl font-bold text-white font-mono tabular-nums flex items-center gap-1">
              <IndianRupee size={28} className="text-white/80" />
              {loading ? '…' : balanceVisible ? balance.toFixed(2) : '••••••'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              {loading ? '…' : `+₹${today.toFixed(2)} today`}
            </span>
            <span className="text-xs text-white/40">
              Total earned: {loading ? '…' : `₹${lifetime.toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/withdraw-page" className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5">
            <ArrowUpRight size={16} />
            Withdraw
          </Link>
          <Link href="/referral-page" className="btn-ghost flex items-center gap-2 text-sm py-2.5 px-5">
            <TrendingUp size={16} />
            Refer & Earn
          </Link>
        </div>
      </div>

      <div className="relative z-10 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/50">
            Progress to next withdrawal (min ₹{loading ? '…' : minWithdraw.toFixed(2)})
          </p>
          <p className="text-xs font-semibold text-white font-mono">
            ₹{loading ? '…' : balance.toFixed(2)} / ₹{loading ? '…' : minWithdraw.toFixed(2)}
          </p>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: loading ? '0%' : `${progressPct}%`,
              background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
            }}
          />
        </div>
        <p className="text-xs text-white/40 mt-1.5">
          {balance >= minWithdraw
            ? 'You are eligible to request a withdrawal.'
            : `You need ₹${needMore.toFixed(2)} more to reach the minimum withdrawal.`}
        </p>
      </div>
    </div>
  );
}
