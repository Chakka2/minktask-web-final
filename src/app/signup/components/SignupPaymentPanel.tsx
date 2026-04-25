'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QrCode, Loader2, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getClientUserId, getReferralCode } from '@/lib/user';
import { getEntryPayQrPayload } from '@/lib/payQr';
import { ENTRY_BASE_AMOUNT } from '@/lib/constants';

const TIMER_SECONDS = 120;

function formatMmSs(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
  displayName: string;
  /** When set, runs after UPI payment is confirmed (e.g. create Firebase account) instead of only linking to dashboard. */
  onPaymentConfirmed?: () => Promise<void>;
};

export default function SignupPaymentPanel({ displayName, onPaymentConfirmed }: Props) {
  const [userId, setUserId] = useState('');
  const [expectedAmount, setExpectedAmount] = useState(ENTRY_BASE_AMOUNT + 0.01);
  const [isBusy, setIsBusy] = useState(true);
  const [initFailed, setInitFailed] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const payStartedRef = useRef(false);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const [confirmFinished, setConfirmFinished] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    const id = getClientUserId();
    setUserId(id);
    const init = async () => {
      setIsBusy(true);
      setInitFailed(false);
      try {
        const params = new URLSearchParams(window.location.search);
        const referredBy = params.get('ref');
        const referralCode = getReferralCode();
        const res = await fetch('/api/entry/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id, referredBy, referralCode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setInitFailed(true);
          toast.error(data?.error || 'Could not load payment details. Try again.');
        } else {
          setExpectedAmount(Number(data.expectedAmount ?? ENTRY_BASE_AMOUNT + 0.01));
          if (typeof data.isLocked === 'boolean') setIsLocked(data.isLocked);
        }
      } catch {
        setInitFailed(true);
        toast.error('Network issue. Check your connection and try again.');
      } finally {
        setIsBusy(false);
      }
    };
    void init();
  }, []);

  const pollStatus = useCallback(async () => {
    const id = userId || getClientUserId();
    if (!id) return;
    try {
      const res = await fetch(`/api/entry/status?userId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.isLocked !== 'boolean') return;
      setIsLocked(data.isLocked);
    } catch {
      /* ignore */
    }
  }, [userId]);

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

  /** User taps to reveal QR and register pay-started (no auto-show). */
  const handlePayWithQr = useCallback(() => {
    if (isBusy || initFailed || !isLocked || payStartedRef.current) return;
    const id = userId || getClientUserId();
    if (!id) return;
    payStartedRef.current = true;
    setShowQr(true);
    setNotifyLoading(true);
    void (async () => {
      try {
        const res = await fetch('/api/entry/pay-started', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id, amount: expectedAmount }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof data?.error === 'string' ? data.error : 'Could not start payment tracking. QR is still valid.');
        } else {
          toast.success('Scan the QR with any UPI app and pay the exact amount shown.');
        }
      } catch {
        toast.error('Network issue. Your QR is still valid — you can pay now.');
      } finally {
        setNotifyLoading(false);
      }
    })();
  }, [isBusy, initFailed, isLocked, userId, expectedAmount]);

  const runContinue = async () => {
    if (!onPaymentConfirmed || confirmRunning || confirmFinished) return;
    setConfirmRunning(true);
    setConfirmError('');
    try {
      await onPaymentConfirmed();
      setConfirmFinished(true);
    } catch (err) {
      setConfirmError(
        err instanceof Error ? err.message : 'Could not refresh your access. Try again in a moment.'
      );
    } finally {
      setConfirmRunning(false);
    }
  };

  const payQrPayload = getEntryPayQrPayload(
    expectedAmount,
    (() => {
      const id = userId || getClientUserId() || 'device';
      const note = `Entry ${id}`;
      return note.length > 50 ? `E ${id.replace(/[^a-zA-Z0-9]/g, '').slice(-24)}` : note;
    })()
  );

  if (!isBusy && !isLocked) {
    if (onPaymentConfirmed) {
      if (confirmError) {
        return (
          <div className="glass-card p-8 text-center animate-slide-up max-w-md mx-auto w-full">
            <p className="text-sm text-red-300 mb-4">{confirmError}</p>
            <button type="button" className="btn-primary w-full" onClick={() => void runContinue()}>
              Try again
            </button>
          </div>
        );
      }
      if (!confirmFinished) {
        return (
          <div className="glass-card p-8 text-center animate-slide-up max-w-md mx-auto w-full">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34,197,94,0.15)' }}
            >
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Entry confirmed</h2>
            <p className="text-sm text-white/50 mb-6">Your payment was verified. Continue when you are ready.</p>
            <button
              type="button"
              className="btn-primary w-full py-3 text-base font-semibold inline-flex items-center justify-center gap-2"
              disabled={confirmRunning}
              onClick={() => void runContinue()}
            >
              {confirmRunning ? (
                <>
                  <Loader2 size={20} className="animate-spin shrink-0" />
                  Working…
                </>
              ) : (
                'Continue to dashboard'
              )}
            </button>
          </div>
        );
      }
      return null;
    }
    return (
      <div className="glass-card p-8 text-center animate-slide-up max-w-md mx-auto w-full">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(34,197,94,0.15)' }}
        >
          <CheckCircle size={36} className="text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Payment confirmed</h2>
        <p className="text-sm text-white/50 mb-6">Welcome, {displayName}. Your dashboard is ready.</p>
        <Link href="/dashboard" className="btn-primary inline-flex justify-center w-full">
          Open dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in-up">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Joining payment</h2>
        <p className="text-sm text-white/50">
          Hi {displayName} — pay exactly{' '}
          <span className="text-white font-mono font-semibold">₹{expectedAmount.toFixed(2)}</span>
        </p>
      </div>

      <div
        className="glass-card p-8 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {isBusy ? (
          <div className="py-12 flex flex-col items-center gap-3 text-white/50">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Preparing your secure payment…</p>
          </div>
        ) : initFailed ? (
          <div className="py-8 space-y-4">
            <p className="text-sm text-white/60">We couldn&apos;t load your payment amount. Check your connection and refresh this page.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <QrCode size={26} className="text-indigo-400" />
            </div>
            <p className="text-3xl font-bold gradient-text font-mono tabular-nums mb-2">₹{expectedAmount.toFixed(2)}</p>
            <p className="text-xs text-white/40 max-w-sm mx-auto mb-6">Scan this QR in any UPI app and pay the exact amount shown.</p>
            {!showQr ? (
              <button type="button" className="btn-primary w-full py-3 text-base font-semibold" onClick={handlePayWithQr}>
                Pay with QR
              </button>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/45">Session</span>
                  <span
                    className="text-base font-mono font-bold tabular-nums px-3 py-1 rounded-xl"
                    style={{
                      background: secondsLeft <= 30 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                      color: secondsLeft <= 30 ? '#fca5a5' : '#a5b4fc',
                    }}
                  >
                    {formatMmSs(secondsLeft)}
                  </span>
                </div>
                <div
                  className="mx-auto mb-6 rounded-2xl p-3 w-fit inline-block"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: '0 10px 30px rgba(8, 15, 35, 0.2)',
                  }}
                >
                  <QRCodeSVG
                    value={payQrPayload}
                    size={240}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    className="rounded-xl block"
                    title="UPI joining payment"
                  />
                </div>
              </>
            )}
            {notifyLoading && (
              <p className="text-xs text-white/45 mt-3 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin shrink-0" />
                Syncing payment request…
              </p>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-white/40">Match the amount exactly, then tap Continue after approval.</p>
    </div>
  );
}
