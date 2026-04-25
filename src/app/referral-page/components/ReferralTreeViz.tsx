import React from 'react';
import { ENTRY_REFERRAL_L1, ENTRY_REFERRAL_L2, ENTRY_REFERRAL_L3, ENTRY_REFERRAL_L4 } from '@/lib/constants';

const LEVELS = [
  { level: 'L1', label: 'Direct', perEach: ENTRY_REFERRAL_L1, color: '#6366f1', bg: 'rgba(99,102,241,0.2)' },
  { level: 'L2', label: 'Second line', perEach: ENTRY_REFERRAL_L2, color: '#818cf8', bg: 'rgba(129,140,248,0.18)' },
  { level: 'L3', label: 'Third line', perEach: ENTRY_REFERRAL_L3, color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
  { level: 'L4', label: 'Fourth line', perEach: ENTRY_REFERRAL_L4, color: '#6ee7b7', bg: 'rgba(16,185,129,0.15)' },
];

export default function ReferralTreeViz() {
  return (
    <div className="glass-card p-5">
      <h3 className="text-base font-semibold text-white mb-2">How your levels pay</h3>
      <p className="text-xs text-white/45 mb-5 leading-relaxed">
        Per paid joining in your network: ₹{ENTRY_REFERRAL_L1} / ₹{ENTRY_REFERRAL_L2} / ₹{ENTRY_REFERRAL_L3} / ₹{ENTRY_REFERRAL_L4}
        {' '}for levels 1-4. Volume and earnings charts will reflect your real data once referrals start — nothing to show here until then.
      </p>
      <div className="space-y-3">
        {LEVELS.map((item) => (
          <div
            key={item.level}
            className="flex items-center justify-between gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: item.bg, color: item.color }}>
                {item.level}
              </span>
              <span className="text-xs text-white/50 truncate">{item.label}</span>
            </div>
            <span className="text-xs font-mono font-semibold tabular-nums text-white/70 shrink-0">₹{item.perEach} / referral</span>
          </div>
        ))}
      </div>
    </div>
  );
}
