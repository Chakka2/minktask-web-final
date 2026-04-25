'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load checkout'));
    document.body.appendChild(s);
  });
}

type Props = {
  label: string;
  /** Signup flow: server session after OTP */
  sessionId?: string;
  /** Logged-in user completing access */
  getIdToken?: () => Promise<string | null>;
  onSuccess: () => void;
  onError: (message: string) => void;
};

export default function RazorpayCheckoutButton({ label, sessionId, getIdToken, onSuccess, onError }: Props) {
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      await loadRazorpayScript();
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) {
        onError('Checkout is not configured.');
        return;
      }
      const body: Record<string, string> = {};
      if (sessionId) body.sessionId = sessionId;
      else if (getIdToken) {
        const tok = await getIdToken();
        if (!tok) {
          onError('Please sign in again.');
          return;
        }
        body.idToken = tok;
      } else {
        onError('Missing checkout context.');
        return;
      }

      const res = await fetch('/api/payment/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(typeof data?.error === 'string' ? data.error : 'Could not start checkout');
        return;
      }

      const orderId = String(data.orderId ?? '');
      const amount = Number(data.amount ?? 0);
      const currency = String(data.currency ?? 'INR');

      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        onError('Checkout unavailable.');
        return;
      }

      const rzp = new Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'MintyTask',
        description: 'Account access',
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyBody: Record<string, string> = {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            };
            if (sessionId) verifyBody.sessionId = sessionId;
            else if (getIdToken) {
              const tok = await getIdToken();
              if (!tok) {
                onError('Please sign in again.');
                return;
              }
              verifyBody.idToken = tok;
            }
            const v = await fetch('/api/payment/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(verifyBody),
            });
            const vd = await v.json().catch(() => ({}));
            if (!v.ok) {
              onError(typeof vd?.error === 'string' ? vd.error : 'Verification failed');
              return;
            }
            onSuccess();
          } catch {
            onError('Something went wrong after payment.');
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
          },
        },
        theme: { color: '#6366f1' },
      });
      rzp.open();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }, [sessionId, getIdToken, onSuccess, onError]);

  return (
    <button type="button" className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={busy} onClick={() => void start()}>
      {busy ? (
        <>
          <Loader2 size={18} className="animate-spin shrink-0" />
          Opening…
        </>
      ) : (
        label
      )}
    </button>
  );
}
