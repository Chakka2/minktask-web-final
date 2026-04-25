import React from 'react';

import { ArrowRight, Star, Users, TrendingUp } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-28 px-4 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, #3b82f6)' }} />
      <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in-up">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <Star size={14} className="text-yellow-400" fill="currentColor" />
          <span className="text-white/80">Trusted by 12,400+ earners across India</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
          Creator Revenue Platform
        </h1>

        <p className="text-lg md:text-2xl text-white/70 max-w-3xl mx-auto mb-12 leading-relaxed">
          Complete a secure one-time entry and grow your income through a 4-tier referral network.
        </p>

        {/* Stats Row */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {[
            { icon: Users, label: 'Active Earners', value: '12,400+' },
            { icon: TrendingUp, label: 'Total Paid Out', value: '₹18.4L+' },
            { icon: Star, label: 'Avg. Monthly Earning', value: '₹340' },
          ]?.map((stat) => {
            const Icon = stat?.icon;
            return (
              <div
                key={`hero-stat-${stat?.label}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card-hover animate-fade-in-up"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Icon size={15} className="text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm font-mono tabular-nums">{stat?.value}</p>
                  <p className="text-white/40 text-xs">{stat?.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#payment" className="btn-primary flex items-center gap-2 text-base animate-pulse-glow">
            Start Earning Now — ₹29
            <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="btn-ghost flex items-center gap-2 text-base">
            See How It Works
          </a>
        </div>

        <p className="mt-4 text-xs text-white/30">One-time payment • No subscription • Lifetime access</p>
      </div>
    </section>
  );
}