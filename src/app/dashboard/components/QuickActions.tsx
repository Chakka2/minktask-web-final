import React from 'react';
import Link from 'next/link';
import { Users, Wallet, TrendingUp, Share2 } from 'lucide-react';
const ACTIONS = [
  { id: 'qa-refer', label: 'Share Referral Link', href: '/referral-page', icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  {
    id: 'qa-invite',
    label: 'Refer & reel links',
    href: '/referral-page',
    icon: Share2,
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.12)',
  },
  { id: 'qa-withdraw', label: 'Request Withdrawal', href: '/withdraw-page', icon: Wallet, color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
  { id: 'qa-earnings', label: 'View All Earnings', href: '/earnings-page', icon: TrendingUp, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
];

export default function QuickActions() {
  return (
    <div className="glass-card p-5">
      <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS?.map((action) => {
          const Icon = action?.icon;
          return (
            <Link key={action?.id} href={action?.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              style={{ background: action?.bg, border: `1px solid ${action?.color}25` }}>
              <Icon size={20} style={{ color: action?.color }} />
              <span className="text-xs font-medium text-white/70 text-center leading-tight">{action?.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}