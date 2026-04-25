'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatLedgerTimeLabel } from '@/lib/activityLedger';
import { useUserSummary } from '@/contexts/UserSummaryContext';
import type { SummaryTransaction } from '@/contexts/UserSummaryContext';

const SOURCE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  referral: { label: 'Earning', bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc' },
  bundle: { label: 'Earning', bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc' },
  withdrawal: { label: 'Withdrawal', bg: 'rgba(239,68,68,0.12)', color: '#fca5a5' },
  system: { label: 'Account', bg: 'rgba(148,163,184,0.12)', color: '#cbd5e1' },
};

export default function RecentTransactions() {
  const { summary, loading } = useUserSummary();
  const preview = useMemo(() => summary.transactions.slice(0, 6), [summary.transactions]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-white">Recent activity</h3>
        <Link href="/earnings-page" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-white/40 py-6 text-center">Loading activity…</p>
      )}

      {!loading && preview.length === 0 && (
        <p className="text-sm text-white/40 py-6 text-center">No transactions yet. Share your link to start earning.</p>
      )}

      <div className="space-y-3">
        {!loading &&
          preview.map((txn) => (
            <TxnRow key={txn.id} txn={txn} />
          ))}
      </div>
    </div>
  );
}

function TxnRow({ txn }: { txn: SummaryTransaction }) {
  const badge = SOURCE_BADGE[txn.source] ?? SOURCE_BADGE.system;
  const time = formatLedgerTimeLabel(txn.createdAtMs);
  const showAmount = txn.amount !== 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/4 transition-all group">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          txn.type === 'credit' ? 'text-green-400' : 'text-red-400'
        }`}
        style={{
          background: txn.type === 'credit' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        }}
      >
        {showAmount ? (txn.type === 'credit' ? '+' : '−') : '•'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{txn.desc}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
            {txn.level ? ` L${txn.level}` : ''}
          </span>
          <span className="text-[10px] text-white/30">{time}</span>
        </div>
      </div>
      {showAmount ? (
        <span
          className={`text-sm font-bold font-mono tabular-nums flex-shrink-0 ${
            txn.type === 'credit' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {txn.type === 'credit' ? '+' : '−'}₹{Math.abs(txn.amount).toFixed(2)}
        </span>
      ) : (
        <span className="text-sm text-white/25 flex-shrink-0 w-14 text-right">—</span>
      )}
    </div>
  );
}
