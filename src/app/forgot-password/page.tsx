'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) return;
    setError('');
    setBusy(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      await sendPasswordResetEmail(auth, em, {
        url: origin ? `${origin}/login` : undefined,
        handleCodeInApp: false,
      });
      setSent(true);
      toast.success('Check your email for a reset link from Firebase.');
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <main className="page-bg min-h-screen flex items-center justify-center px-4">
        <div className="glass-card w-full max-w-md p-8 space-y-4 text-center">
          <h1 className="text-xl font-bold text-white">Check your email</h1>
          <p className="text-sm text-white/50">
            If an account exists for <span className="text-white/70">{email.trim().toLowerCase()}</span>, you will receive a link to
            choose a new password.
          </p>
          <Link href="/login" className="btn-primary inline-flex justify-center w-full">
            Back to log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-bg min-h-screen flex items-center justify-center px-4">
      <form onSubmit={(ev) => void onSubmit(ev)} className="glass-card w-full max-w-md p-8 space-y-4">
        <h1 className="text-2xl font-bold text-white">Forgot password</h1>
        <p className="text-sm text-white/50">We will send a secure reset link to your email (Firebase).</p>
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
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        <button type="submit" className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin shrink-0" />
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </button>
        <p className="text-sm text-white/50 text-center">
          <Link href="/login" className="text-blue-400 hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </main>
  );
}
