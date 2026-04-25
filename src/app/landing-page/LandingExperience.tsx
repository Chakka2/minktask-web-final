'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentSection from './components/PaymentSection';
import LandingNav from './components/LandingNav';
import LandingFooter from './components/LandingFooter';
import { ENTRY_BASE_AMOUNT, REEL_BUNDLE_PRICE } from '@/lib/constants';
import { Sparkles, Film, ChevronRight } from 'lucide-react';

export type LandingPlan = 'refer' | 'reel';

export default function LandingExperience() {
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<LandingPlan>('refer');
  const seededFromUrl = useRef(false);

  useEffect(() => {
    if (seededFromUrl.current) return;
    seededFromUrl.current = true;
    if (searchParams.get('for') === 'reel') setPlan('reel');
  }, [searchParams]);

  const referSubtitle = useMemo(
    () =>
      'Refer our website to others—when they join, you earn instantly. 4-level system: ₹20 direct, then ₹3, ₹2, ₹1 from your network.',
    []
  );

  const scrollToPay = useCallback(() => {
    document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-screen landing-premium text-[hsl(210_25%_92%)]">
      <LandingNav onPickPay={scrollToPay} />

      <main className="pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/35 mb-4 font-medium">MintyTask</p>
          <h1 className="text-3xl sm:text-4xl md:text-[2.65rem] font-semibold tracking-tight text-white/95 mb-4 leading-[1.15]">
            Choose how you want to start
          </h1>
          <p className="text-sm sm:text-base text-white/45 max-w-lg mx-auto leading-relaxed font-light">
            One quick UPI QR. No clutter—pick your path and pay in seconds.
          </p>
        </div>

        <div id="choose" className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4 md:gap-5 mb-12 md:mb-14">
          <button
            type="button"
            onClick={() => {
              setPlan('refer');
              requestAnimationFrame(scrollToPay);
            }}
            className={`group text-left rounded-2xl p-6 md:p-7 transition-all duration-300 border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
              plan === 'refer'
                ? 'border-white/[0.18] bg-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.35)]'
                : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300/90">
                <Sparkles size={20} strokeWidth={1.5} />
              </span>
              <span className="text-lg font-semibold tabular-nums text-white/90">₹{ENTRY_BASE_AMOUNT}</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2 tracking-tight">Refer &amp; earn</h2>
            <p className="text-xs sm:text-sm text-white/42 leading-relaxed mb-5 font-light">{referSubtitle}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white/50 group-hover:text-white/70">
              Pay with QR <ChevronRight size={14} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlan('reel');
              requestAnimationFrame(scrollToPay);
            }}
            className={`group text-left rounded-2xl p-6 md:p-7 transition-all duration-300 border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
              plan === 'reel'
                ? 'border-white/[0.18] bg-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.35)]'
                : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300/90">
                <Film size={20} strokeWidth={1.5} />
              </span>
              <span className="text-lg font-semibold tabular-nums text-white/90">₹{REEL_BUNDLE_PRICE}</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2 tracking-tight">Reel bundle</h2>
            <p className="text-xs sm:text-sm text-white/42 leading-relaxed mb-5 font-light">
              Ready to post—100k reels, all categories. Instant access after payment.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white/50 group-hover:text-white/70">
              Pay with QR <ChevronRight size={14} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        </div>

        <PaymentSection plan={plan} />

        <section className="max-w-xl mx-auto mt-16 md:mt-20 px-1">
          <h3 className="text-center text-[11px] uppercase tracking-[0.22em] text-white/30 mb-6 font-medium">FAQ</h3>
          <div className="space-y-4 text-left text-sm text-white/45 leading-relaxed font-light">
            <p>
              <span className="text-white/55 font-medium">Refer &amp; earn (₹{ENTRY_BASE_AMOUNT})</span> — One-time access to
              your dashboard and the full 4-level referral program.
            </p>
            <p>
              <span className="text-white/55 font-medium">Reel bundle (₹{REEL_BUNDLE_PRICE})</span> — Content pack only; we
              send you to the private Telegram group after payment is confirmed. No dashboard.
            </p>
            <p>Share links from your dashboard: use the Refer link for ₹20/₹3/₹2/₹1 tiers, or the Reel link for ₹25 when they buy the bundle.</p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
