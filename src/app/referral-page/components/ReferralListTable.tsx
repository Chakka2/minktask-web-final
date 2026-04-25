'use client';

import React from 'react';
import { Users } from 'lucide-react';

export default function ReferralListTable() {
  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-semibold text-white mb-4">Referral list</h3>
      <div className="flex flex-col items-center justify-center text-center py-14 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(99,102,241,0.12)' }}
        >
          <Users size={28} className="text-indigo-400" />
        </div>
        <p className="text-sm text-white/70 font-medium mb-2">No referrals yet</p>
        <p className="text-sm text-white/40 max-w-sm leading-relaxed">
          Share your link from above. When people join and pay, they&apos;ll appear here with level and activity. New accounts start
          with an empty list — numbers grow as your network does.
        </p>
      </div>
    </div>
  );
}
