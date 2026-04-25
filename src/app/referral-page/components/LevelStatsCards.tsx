import React from 'react';
import { ENTRY_REFERRAL_L1, ENTRY_REFERRAL_L2, ENTRY_REFERRAL_L3, ENTRY_REFERRAL_L4 } from '@/lib/constants';

const LEVEL_INFO = [
  {
    id: 'level-1',
    level: 'Level 1',
    description: 'Direct referrals',
    perReferral: ENTRY_REFERRAL_L1,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.25)',
  },
  {
    id: 'level-2',
    level: 'Level 2',
    description: "Your referrals' referrals",
    perReferral: ENTRY_REFERRAL_L2,
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.1)',
    border: 'rgba(129,140,248,0.2)',
  },
  {
    id: 'level-3',
    level: 'Level 3',
    description: 'Third level in your network',
    perReferral: ENTRY_REFERRAL_L3,
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.18)',
  },
  {
    id: 'level-4',
    level: 'Level 4',
    description: 'Fourth level in your network',
    perReferral: ENTRY_REFERRAL_L4,
    color: '#6ee7b7',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.2)',
  },
];

export default function LevelStatsCards() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45 leading-relaxed">
        When someone you refer completes the ₹29 joining payment, rewards follow this 4-tier structure (₹20, ₹3, ₹2, ₹1). Your personal counts and
        earnings will show in the dashboard wallet as referrals come in — we keep this page focused on your link and how the program
        works.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {LEVEL_INFO.map((stat) => (
          <div key={stat.id} className="glass-card-hover p-5" style={{ borderColor: stat.border }}>
            <div className="flex items-center justify-between mb-4 gap-2">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: stat.bg, color: stat.color, border: `1px solid ${stat.border}` }}
              >
                {stat.level}
              </span>
              <span className="text-xs text-white/40 text-right">{stat.description}</span>
            </div>
            <div className="pt-2 border-t border-white/8">
              <p className="text-xs text-white/40 mb-1">Per qualifying joining payment</p>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: stat.color }}>
                ₹{stat.perReferral}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
