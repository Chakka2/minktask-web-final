'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Lock, Sparkles } from 'lucide-react';
import { getLandingEntryUserId } from '@/lib/user';
import { ENTRY_BASE_AMOUNT } from '@/lib/constants';

/**
 * Landing entry gate: primary “Create account” path for new users (after payment is confirmed server-side).
 * Login stays in the nav. Real-time feel via polling the same entry status as PaymentSection (no manual refresh).
 */
export default function EntryGateCard() {
  const [entryLocked, setEntryLocked] = useState(true);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const poll = useCallback(async () => {
    const id = userId || getLandingEntryUserId();
    if (!id) return;
    try {
      const res = await fetch(`/api/entry/status?userId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.isLocked === 'boolean') {
        setEntryLocked(data.isLocked);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setUserId(getLandingEntryUserId());
  }, []);

  useEffect(() => {
    void poll();
  }, [poll]);

  useEffect(() => {
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [poll]);

  return (
    <section className="py-10 px-4 scroll-mt-20" id="create-account">
      <div className="max-w-lg mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-center"
          style={{
            background: 'linear-gradient(165deg, rgba(45,212,191,0.08), rgba(99,102,241,0.06), rgba(255,255,255,0.03))',
            border: '1px solid rgba(45,212,191,0.22)',
            boxShadow: '0 20px 48px rgba(4, 12, 32, 0.38)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          <div
            className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.5), transparent 70%)' }}
          />
          <div className="relative z-10">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(45,212,191,0.14)', border: '1px solid rgba(45,212,191,0.25)' }}
            >
              <UserPlus size={28} className="text-teal-300" strokeWidth={2} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-300/90 mb-2 flex items-center justify-center gap-1.5">
              <Sparkles size={12} className="shrink-0" />
              New members
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Create account</h2>
            <p className="text-sm text-white/55 mb-8 leading-relaxed max-w-sm mx-auto">
              Pay the ₹{ENTRY_BASE_AMOUNT} entry on this device. After we confirm your payment (Telegram / admin), you can
              register here — then you go straight to your dashboard.
            </p>

            {loading ? (
              <p className="text-sm text-white/40">Checking your entry status…</p>
            ) : entryLocked ? (
              <div className="space-y-4">
                <div
                  className="rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-sm text-amber-200/95"
                  style={{
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.22)',
                  }}
                >
                  <Lock size={16} className="shrink-0 opacity-90" />
                  Entry not unlocked yet — complete payment below first.
                </div>
                <a href="#payment" className="btn-primary inline-flex w-full justify-center py-3.5 text-base font-semibold">
                  Go to payment — ₹{ENTRY_BASE_AMOUNT}
                </a>
              </div>
            ) : (
              <Link href="/signup" className="btn-primary inline-flex w-full justify-center py-3.5 text-base font-semibold">
                Create account
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
