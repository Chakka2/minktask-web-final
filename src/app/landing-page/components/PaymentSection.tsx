'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, QrCode, Loader2, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import Link from 'next/link';
import { clearClientUserId, getLandingEntryUserId, getReferralCode } from '@/lib/user';
import { getEntryPayQrPayload } from '@/lib/payQr';
import { ENTRY_BASE_AMOUNT, REEL_BUNDLE_PRICE, REEL_TELEGRAM_COMMUNITY_URL } from '@/lib/constants';
import type { LandingPlan } from '../LandingExperience';

const TIMER_SECONDS = 120;

function formatMmSs(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
  plan: LandingPlan;
};

export default function PaymentSection({ plan }: Props) {
  const [expectedAmount, setExpectedAmount] = useState<number>(
    plan === 'reel' ? REEL_BUNDLE_PRICE : ENTRY_BASE_AMOUNT
  );
  const [isLocked, setIsLocked] = useState(true);
  const [reelAccess, setReelAccess] = useState(false);
  const [userId, setUserId] = useState('');
  const [isBusy, setIsBusy] = useState(true);
  const [initFailed, setInitFailed] = useState(false);
  const [initErrorMessage, setInitErrorMessage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const payStartedRef = useRef(false);

  useEffect(() => {
    payStartedRef.current = false;
    setShowQr(false);
  }, [plan]);

  useEffect(() => {
    const id = getLandingEntryUserId();
    setUserId(id);

    const init = async () => {
      setIsBusy(true);
      setInitFailed(false);
      setInitErrorMessage(null);
      try {
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const referredBy = params.get('ref');
        const referralCode = getReferralCode();
        const res = await fetch('/api/entry/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id, referredBy, referralCode, plan }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setInitFailed(true);
          const msg =
            typeof data?.error === 'string' && data.error.trim()
              ? data.error
              : 'Could not load your payment details right now. Please refresh and try again.';
          setInitErrorMessage(msg);
          toast.error(msg);
        } else {
          setExpectedAmount(
            Number(data.expectedAmount ?? (plan === 'reel' ? REEL_BUNDLE_PRICE : ENTRY_BASE_AMOUNT))
          );
          if (typeof data.isLocked === 'boolean') setIsLocked(data.isLocked);
          if (typeof data.reelConfirmed === 'boolean') setReelAccess(data.reelConfirmed);
        }
      } catch {
        setInitFailed(true);
        setInitErrorMessage('Network issue while loading payment details. Please try again.');
        toast.error('Network issue while loading payment details. Please try again.');
      } finally {
        setIsBusy(false);
      }
    };
    void init();
  }, [plan]);

  const pollStatus = useCallback(async () => {
    if (!userId || initFailed) return;
    try {
      if (plan === 'refer') {
        const res = await fetch(`/api/entry/status?userId=${encodeURIComponent(userId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (typeof data?.error === 'string' && data.error.trim()) {
            setInitErrorMessage(data.error);
          }
          setInitFailed(true);
          return;
        }
        if (typeof data.isLocked === 'boolean') setIsLocked(data.isLocked);
      } else {
        const res = await fetch(`/api/reel-access/status?userId=${encodeURIComponent(userId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (typeof data.accessGranted === 'boolean') setReelAccess(data.accessGranted);
      }
    } catch {
      /* ignore */
    }
  }, [userId, initFailed, plan]);

  useEffect(() => {
    const ms = showQr ? 3000 : 8000;
    const timer = setInterval(pollStatus, ms);
    return () => clearInterval(timer);
  }, [pollStatus, showQr]);

  useEffect(() => {
    if (!showQr) return;
    setSecondsLeft(TIMER_SECONDS);
    const started = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, TIMER_SECONDS - elapsed);
      setSecondsLeft(left);
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [showQr]);

  const handlePayWithQr = useCallback(() => {
    if (isBusy || payStartedRef.current) return;
    if (plan === 'refer' && !isLocked) return;
    if (plan === 'reel' && reelAccess) return;

    const id = userId || getLandingEntryUserId();
    if (!id) return;
    payStartedRef.current = true;
    setShowQr(true);
    setNotifyLoading(true);
    void (async () => {
      try {
        const res = await fetch('/api/entry/pay-started', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: id,
            amount: expectedAmount,
            kind: plan === 'reel' ? 'reel_landing' : 'entry',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(
            typeof data?.error === 'string'
              ? data.error
              : 'Could not register payment request. Your QR is still valid.'
          );
        } else {
          toast.success('Scan the QR with any UPI app and pay the exact amount shown.');
        }
      } catch {
        toast.error('Network issue. Your QR is still valid.');
      } finally {
        setNotifyLoading(false);
      }
    })();
  }, [isBusy, isLocked, userId, expectedAmount, plan, reelAccess]);

  const payNote =
    plan === 'reel'
      ? (() => {
          const id = userId || 'device';
          const note = `Reel ${id}`;
          return note.length > 50 ? `R ${id.replace(/[^a-zA-Z0-9]/g, '').slice(-24)}` : note;
        })()
      : (() => {
          const id = userId || 'device';
          const note = `Entry ${id}`;
          return note.length > 50 ? `E ${id.replace(/[^a-zA-Z0-9]/g, '').slice(-24)}` : note;
        })();

  const payQrPayload = getEntryPayQrPayload(expectedAmount, payNote);

  const handleStartOver = () => {
    if (
      !window.confirm(
        'Start a new payment on this device? Only use this if you are testing or this payment is not yours.'
      )
    ) {
      return;
    }
    clearClientUserId();
    payStartedRef.current = false;
    window.location.reload();
  };

  const referDone = plan === 'refer' && !isLocked && !isBusy;
  const reelDone = plan === 'reel' && reelAccess && !isBusy;

  if (referDone) {
    return (
      <section id="payment" className="py-10 md:py-14 px-4 scroll-mt-24">
        <div className="max-w-md mx-auto rounded-2xl border border-white/[0.1] bg-white/[0.04] p-8 md:p-10 text-center backdrop-blur-md">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(34,197,94,0.12)' }}
          >
            <CheckCircle size={32} className="text-emerald-400/90" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">You&apos;re in</h3>
          <p className="text-sm text-white/45 mb-8 leading-relaxed font-light">
            Payment confirmed. Create your account to open the dashboard and start inviting.
          </p>
          <Link
            href="/signup"
            className="inline-flex w-full justify-center rounded-xl bg-white text-[hsl(222_47%_8%)] font-semibold py-3.5 text-sm tracking-wide hover:bg-white/95 transition-colors"
          >
            Continue to dashboard setup
          </Link>
          <p className="text-xs text-white/35 mt-5">
            Already registered?{' '}
            <Link href="/login?next=/dashboard" className="text-white/55 hover:text-white underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
          <button
            type="button"
            onClick={handleStartOver}
            className="w-full mt-6 text-[11px] text-white/30 hover:text-white/45 underline underline-offset-2"
          >
            Wrong device session? Reset
          </button>
        </div>
      </section>
    );
  }

  if (reelDone) {
    return (
      <section id="payment" className="py-10 md:py-14 px-4 scroll-mt-24">
        <div className="max-w-md mx-auto rounded-2xl border border-white/[0.1] bg-white/[0.04] p-8 md:p-10 text-center backdrop-blur-md">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(34,211,238,0.1)' }}
          >
            <CheckCircle size={32} className="text-cyan-300/90" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">Reel pack unlocked</h3>
          <p className="text-sm text-white/45 mb-8 leading-relaxed font-light">
            Join the private Telegram group for downloads and updates—same link every time.
          </p>
          <a
            href={REEL_TELEGRAM_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white text-[hsl(222_47%_8%)] font-semibold py-3.5 text-sm tracking-wide hover:bg-white/95 transition-colors"
          >
            Open Telegram group
            <ExternalLink size={16} className="opacity-70" />
          </a>
          <button
            type="button"
            onClick={handleStartOver}
            className="w-full mt-6 text-[11px] text-white/30 hover:text-white/45 underline underline-offset-2"
          >
            Wrong device session? Reset
          </button>
        </div>
      </section>
    );
  }

  const title = plan === 'reel' ? 'Reel bundle checkout' : 'Refer & earn checkout';
  const blurb =
    plan === 'reel'
      ? `Pay ₹${REEL_BUNDLE_PRICE.toFixed(2)} once. We confirm on UPI, then you get the Telegram link.`
      : `Pay ₹${ENTRY_BASE_AMOUNT.toFixed(2)} once to unlock your dashboard and the 4-level referral program.`;

  return (
    <section id="payment" className="py-10 md:py-14 px-4 scroll-mt-24">
      <div className="max-w-md mx-auto text-center mb-8">
        <h2 className="text-xl font-semibold text-white/95 tracking-tight mb-2">{title}</h2>
        <p className="text-sm text-white/40 font-light leading-relaxed">{blurb}</p>
      </div>

      <div
        className="max-w-md mx-auto relative z-10 p-6 sm:p-8 text-center rounded-2xl animate-fade-in-up"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 50px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <QrCode size={26} className="text-white/50" strokeWidth={1.5} />
        </div>

        {isBusy ? (
          <div className="py-10 flex flex-col items-center gap-3 text-white/40">
            <Loader2 size={26} className="animate-spin" strokeWidth={1.5} />
            <p className="text-sm font-light">Preparing your QR…</p>
          </div>
        ) : (
          <>
            {initFailed && (
              <p className="text-xs text-amber-200/80 mb-4 text-left break-words leading-relaxed">
                {initErrorMessage || 'Sync issue — QR below is still valid if the amount matches.'}
              </p>
            )}
            <p className="text-3xl font-semibold text-white tabular-nums mb-1 tracking-tight">₹{expectedAmount.toFixed(2)}</p>
            <p className="text-[11px] text-white/35 mb-6 font-light uppercase tracking-wider">Exact UPI amount</p>
            {!showQr ? (
              <button
                type="button"
                className="w-full rounded-xl bg-white text-[hsl(222_47%_8%)] font-semibold py-3.5 text-sm hover:bg-white/95 transition-colors"
                onClick={handlePayWithQr}
              >
                Show payment QR
              </button>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">Timer</span>
                  <span
                    className="text-base font-mono font-semibold tabular-nums px-3 py-1 rounded-lg"
                    style={{
                      background: secondsLeft <= 30 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                      color: secondsLeft <= 30 ? '#fca5a5' : 'rgba(255,255,255,0.75)',
                    }}
                  >
                    {formatMmSs(secondsLeft)}
                  </span>
                </div>
                <div
                  className="mx-auto mb-5 rounded-xl p-3 w-fit inline-block"
                  style={{
                    background: 'rgba(255,255,255,0.94)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                  }}
                >
                  <QRCodeSVG
                    value={payQrPayload}
                    size={240}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    className="rounded-lg block"
                    title="UPI payment QR"
                  />
                </div>
                <button
                  type="button"
                  className="w-full rounded-xl bg-white text-[hsl(222_47%_8%)] font-semibold py-3.5 text-sm hover:bg-white/95 transition-colors mb-2"
                  onClick={handlePayWithQr}
                >
                  I have paid
                </button>
              </>
            )}
            {notifyLoading && (
              <p className="text-[11px] text-white/35 mb-2 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin shrink-0" />
                Syncing…
              </p>
            )}
            <p className="text-[11px] text-white/30 mt-4 leading-relaxed font-light">
              Payee details are embedded in the QR. Use PhonePe, Google Pay, Paytm, or any UPI app.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
