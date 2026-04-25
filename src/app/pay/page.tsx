'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import SignupPaymentPanel from '@/app/signup/components/SignupPaymentPanel';
import { toast } from 'sonner';

export default function PayPage() {
  const router = useRouter();
  const { firebaseUser, profile, isPaid, loading, refreshProfile } = useFirebaseAuth();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/login?next=/pay');
      return;
    }
    // Real-time: when Telegram/admin updates `users/{uid}`, onSnapshot flips `isPaid` and we leave /pay immediately.
    if (isPaid) {
      router.replace('/dashboard');
    }
  }, [loading, firebaseUser, profile, isPaid, router]);

  const onPaymentConfirmed = useCallback(async () => {
    // refreshProfile uses /api/auth/me (Admin SDK) so paid status does not depend on client Firestore rules.
    const attempts = 15;
    const delayMs = 1000;
    for (let i = 0; i < attempts; i++) {
      const p = await refreshProfile();
      if (p?.paymentStatus === 'paid') {
        toast.success('All set.');
        router.replace('/dashboard');
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(
      'Payment is not confirmed for this account yet. If you already paid, wait for approval or contact support with your UPI ref.'
    );
  }, [refreshProfile, router]);

  if (loading || !firebaseUser || isPaid) {
    return (
      <main className="page-bg min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-white/50">Loading…</p>
      </main>
    );
  }

  const display =
    firebaseUser.displayName?.trim() ||
    (firebaseUser.email ? firebaseUser.email.split('@')[0] : '') ||
    'there';

  return (
    <main className="page-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Complete access</h1>
          <p className="text-sm text-white/50 leading-relaxed">
            Scan the UPI QR below and pay the exact amount shown. After it&apos;s approved on our side, you&apos;ll go to your dashboard.
          </p>
        </div>
        <SignupPaymentPanel displayName={display} onPaymentConfirmed={onPaymentConfirmed} />
      </div>
    </main>
  );
}
