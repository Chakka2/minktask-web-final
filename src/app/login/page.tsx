'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebaseClient';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function safeInternalPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  if (next === '/login' || next === '/signup' || next === '/pay') return '/dashboard';
  return next;
}

function describeLoginFailure(err: unknown): { toastTitle: string; toastDescription?: string; inline?: string } {
  if (err instanceof FirebaseError) {
    if (err.code === 'auth/user-not-found') {
      return {
        toastTitle: 'No account found',
        toastDescription:
          'There is no account for this email. Pay on the home page, wait for confirmation, then use Create account — or check the email you used.',
      };
    }
    if (err.code === 'auth/wrong-password') {
      return {
        toastTitle: 'Wrong password',
        toastDescription: 'Try again or use Forgot password.',
      };
    }
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
      return {
        toastTitle: 'No account found',
        toastDescription:
          'We could not sign you in with those details. New users must register after entry payment is confirmed.',
      };
    }
    if (err.code === 'auth/too-many-requests') {
      return { toastTitle: 'Too many attempts', toastDescription: 'Wait a moment and try again.' };
    }
  }
  return {
    toastTitle: 'Sign-in failed',
    toastDescription: 'Check your connection and try again.',
  };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextAfter = safeInternalPath(searchParams.get('next'));
  const { firebaseUser, profile, loading: authLoading, refreshProfile } = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser || !profile) return;
    if (profile.paymentStatus === 'paid') {
      router.replace(nextAfter);
    } else {
      router.replace('/pay');
    }
  }, [authLoading, firebaseUser, profile, router, nextAfter]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password;
    if (!cleanEmail || !cleanPass) return;
    setError('');
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const p = await refreshProfile();
      if (p?.paymentStatus === 'paid') {
        router.replace(nextAfter);
        return;
      }
      router.replace('/pay');
    } catch (err) {
      const { toastTitle, toastDescription, inline } = describeLoginFailure(err);
      toast.error(toastTitle, { description: toastDescription });
      setError(inline ?? '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-bg min-h-screen flex items-center justify-center px-4">
      <form onSubmit={(ev) => void onSubmit(ev)} className="glass-card w-full max-w-md p-8 space-y-4">
        <h1 className="text-2xl font-bold text-white">Login</h1>
        <p className="text-sm text-white/50">Use the email and password for your existing account.</p>
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
          autoComplete="current-password"
          placeholder="Password"
        />
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        <button type="submit" className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin shrink-0" />
              Signing in…
            </>
          ) : (
            'Continue'
          )}
        </button>
        <p className="text-sm text-white/50">
          <Link href="/forgot-password" className="text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="text-sm text-white/50">
          New here? Pay first, then{' '}
          <Link href="/landing-page#create-account" className="text-blue-400 hover:underline">
            create an account
          </Link>{' '}
          after confirmation.
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="page-bg min-h-screen flex items-center justify-center px-4">
          <p className="text-sm text-white/50">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
