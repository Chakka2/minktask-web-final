'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebaseClient';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { getLandingEntryUserId } from '@/lib/user';
import { Loader2, Lock } from 'lucide-react';

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser, profile, loading: authLoading, refreshProfile } = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [entryLocked, setEntryLocked] = useState(true);
  const [entryLoading, setEntryLoading] = useState(true);

  const referredBy = searchParams.get('ref')?.trim() || '';

  const refreshEntryGate = useCallback(async () => {
    const id = getLandingEntryUserId();
    try {
      const res = await fetch(`/api/entry/status?userId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.isLocked === 'boolean') {
        setEntryLocked(data.isLocked);
      }
    } catch {
      /* keep last state */
    } finally {
      setEntryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEntryGate();
  }, [refreshEntryGate]);

  useEffect(() => {
    const t = setInterval(() => void refreshEntryGate(), 3000);
    return () => clearInterval(t);
  }, [refreshEntryGate]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser || !profile) return;
    if (profile.paymentStatus === 'paid') {
      router.replace('/dashboard');
    } else {
      router.replace('/pay');
    }
  }, [authLoading, firebaseUser, profile, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (entryLocked) {
      setError('Entry is not confirmed on this device yet. Complete payment on the home page first.');
      return;
    }
    const em = email.trim().toLowerCase();
    if (!em || password.length < 6) {
      setError('Use a valid email and a password of at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setBusy(true);
    try {
      let res: Response;
      try {
        res = await fetch('/api/auth/signup/register-after-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: em,
            password,
            deviceUserId: getLandingEntryUserId(),
            referredBy: referredBy || undefined,
          }),
        });
      } catch {
        setError('Network error. Check your connection and try again.');
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };

      if (!res.ok) {
        if (res.status === 409 && data?.code === 'EMAIL_TAKEN') {
          setError(typeof data?.error === 'string' ? data.error : 'Try signing in instead.');
          return;
        }
        if (res.status === 400 && data?.code === 'PAYMENT_PENDING') {
          setError(
            typeof data?.error === 'string'
              ? data.error
              : 'Complete entry payment on the home page on this device first, then try again.'
          );
          return;
        }
        setError(typeof data?.error === 'string' ? data.error : 'Could not create account');
        return;
      }

      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }

      await new Promise((r) => setTimeout(r, 400));

      const trySignIn = async () => {
        await signInWithEmailAndPassword(auth, em, password);
      };

      try {
        await trySignIn();
      } catch (first: unknown) {
        const retryable =
          first instanceof FirebaseError &&
          (first.code === 'auth/invalid-credential' || first.code === 'auth/user-not-found');
        if (retryable) {
          await new Promise((r) => setTimeout(r, 1200));
          await trySignIn();
        } else {
          throw first;
        }
      }

      try {
        await refreshProfile();
      } catch {
        /* Firestore may lag; dashboard reloads profile */
      }
      try {
        router.replace('/dashboard');
      } catch {
        window.location.assign('/dashboard');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg
          ? `Could not finish sign-in: ${msg}`
          : 'Registration may have succeeded — use Login with the same email and password.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (entryLoading) {
    return (
      <main className="page-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
        <p className="mt-4 text-sm text-white/50">Checking entry status…</p>
      </main>
    );
  }

  if (entryLocked) {
    return (
      <main className="page-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up glass-card p-8 text-center space-y-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.22)' }}
          >
            <Lock size={28} className="text-teal-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Entry not unlocked</h1>
            <p className="text-sm text-white/55 leading-relaxed">
              Pay ₹29 on this device and wait for confirmation. This page updates automatically as soon as you&apos;re
              approved — no refresh needed.
            </p>
          </div>
          <Link href="/landing-page#payment" className="btn-primary inline-flex w-full justify-center py-3">
            Go to payment
          </Link>
          <p className="text-xs text-white/40">
            Already registered?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90 mb-2">Sign up</p>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
        </div>
        <form onSubmit={(ev) => void onSubmit(ev)} className="glass-card w-full p-8 space-y-4">
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className="input-field"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
          />
          <input
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className="input-field"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Password"
          />
          <input
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            className="input-field"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Confirm password"
          />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button type="submit" className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin shrink-0" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
          <p className="text-sm text-white/50 text-center">
            Already registered?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="page-bg min-h-screen flex items-center justify-center px-4">
          <p className="text-sm text-white/50">Loading…</p>
        </main>
      }
    >
      <SignupPageInner />
    </Suspense>
  );
}
