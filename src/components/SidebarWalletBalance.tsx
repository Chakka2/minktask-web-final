'use client';

import { IndianRupee } from 'lucide-react';
import { useUserSummary } from '@/contexts/UserSummaryContext';

export default function SidebarWalletBalance() {
  const { summary, loading } = useUserSummary();
  const text = loading ? '…' : summary.walletBalance.toFixed(2);

  return (
    <div
      className="mx-3 mt-4 p-3 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
        border: '1px solid rgba(99,102,241,0.2)',
      }}
    >
      <p className="text-xs text-white/50 mb-1">Wallet Balance</p>
      <p className="text-lg font-bold text-white font-mono tabular-nums flex items-center gap-1">
        <IndianRupee size={14} />
        <span>{text}</span>
      </p>
    </div>
  );
}
