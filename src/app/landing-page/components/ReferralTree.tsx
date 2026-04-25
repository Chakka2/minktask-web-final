import React from 'react';

export default function ReferralTree() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Referral Tree Grows</h2>
          <p className="text-white/50 text-lg">One referral becomes many — 4 tiers earn you more</p>
        </div>

        <div className="glass-card-hover p-8 md:p-12 animate-fade-in-up">
          {/* You */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-white font-bold text-lg mb-2 animate-pulse-glow">
              You
            </div>
            <p className="text-xs text-white/40 mb-6">Share your link</p>

            {/* L1 connector */}
            <div className="w-px h-8 bg-gradient-to-b from-blue-500/60 to-transparent mb-2" />

            {/* Level 1 */}
            <div className="w-full">
              <div className="text-center mb-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>Level 1 — ₹20 each</span>
              </div>
              <div className="flex justify-center gap-3 md:gap-6 mb-4">
                {['Priya', 'Amit', 'Sunita']?.map((name) => (
                  <div key={`l1-${name}`} className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-bold mb-1"
                      style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                      {name?.[0]}
                    </div>
                    <p className="text-[10px] text-white/50">{name}</p>
                  </div>
                ))}
              </div>

              {/* L2 connector */}
              <div className="flex justify-center">
                <div className="w-px h-6 bg-gradient-to-b from-indigo-500/60 to-transparent" />
              </div>

              {/* Level 2 */}
              <div className="text-center mb-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>Level 2 — ₹3 each</span>
              </div>
              <div className="flex justify-center gap-2 md:gap-4 mb-4">
                {['Raj', 'Neha', 'Kiran', 'Deepa', 'Ankit']?.map((name) => (
                  <div key={`l2-${name}`} className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-1"
                      style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      {name?.[0]}
                    </div>
                    <p className="text-[10px] text-white/40 hidden md:block">{name}</p>
                  </div>
                ))}
              </div>

              {/* L3 connector */}
              <div className="flex justify-center">
                <div className="w-px h-6 bg-gradient-to-b from-cyan-500/60 to-transparent" />
              </div>

              {/* Level 3 */}
              <div className="text-center mb-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(34,211,238,0.1)', color: '#67e8f9', border: '1px solid rgba(34,211,238,0.2)' }}>Level 3 — ₹2 each</span>
              </div>
              <div className="flex justify-center gap-2 flex-wrap mb-4">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']?.map((letter) => (
                  <div key={`l3-${letter}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                    {letter}
                  </div>
                ))}
              </div>
              <div className="text-center mb-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.24)' }}>Level 4 — ₹1 each</span>
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                {['I', 'J', 'K', 'L', 'M', 'N']?.map((letter) => (
                  <div key={`l4-${letter}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.16)' }}>
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-xl">
              {[
                { level: 'L1 × 3', earn: '₹60' },
                { level: 'L2 × 5', earn: '₹15' },
                { level: 'L3 × 8', earn: '₹16' },
                { level: 'L4 × 6', earn: '₹6' },
              ]?.map((item) => (
                <div key={`tree-sum-${item?.level}`} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs text-white/40">{item?.level}</p>
                  <p className="text-base font-bold text-white font-mono tabular-nums">{item?.earn}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-white/70">
              Total: <span className="gradient-text font-bold text-base">₹97</span> from this example tree
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}