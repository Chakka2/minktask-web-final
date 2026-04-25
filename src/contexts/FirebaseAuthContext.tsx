'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { type FirestoreUserProfile, profileFromUserDoc } from '@/lib/userProfileFirestore';

export type { FirestoreUserProfile };

type FirebaseAuthContextValue = {
  firebaseUser: User | null;
  profile: FirestoreUserProfile | null;
  /** Firebase session present. */
  isAuthenticated: boolean;
  /** Logged in and entry not active yet (send to /pay or wait for Telegram approval). */
  isNewUser: boolean;
  /** True when the user has completed entry payment / activation (same as `profile.paymentStatus === 'paid'`). */
  isPaid: boolean;
  loading: boolean;
  refreshProfile: () => Promise<FirestoreUserProfile | null>;
  signOutApp: () => Promise<void>;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

async function loadProfileFromClient(uid: string): Promise<FirestoreUserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return profileFromUserDoc(snap.data() as Record<string, unknown>, '');
}

/** Prefer server (Admin SDK): works when Firestore rules block client reads of `users/{uid}`. */
async function loadProfileHybrid(u: User, forceRefreshToken?: boolean): Promise<FirestoreUserProfile | null> {
  try {
    const token = await u.getIdToken(forceRefreshToken ?? false);
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'same-origin',
    });
    if (res.ok) {
      const data = (await res.json()) as {
        email?: string;
        paymentStatus?: string;
        referralCode?: string | null;
      };
      const ps = data.paymentStatus === 'paid' ? 'paid' : 'unpaid';
      return {
        paymentStatus: ps,
        email: String(data.email ?? u.email ?? ''),
        referralCode: typeof data.referralCode === 'string' ? data.referralCode : undefined,
      };
    }
  } catch (e) {
    console.error('[loadProfileHybrid] server', e);
  }
  try {
    const client = await loadProfileFromClient(u.uid);
    if (client) {
      return {
        ...client,
        email: client.email || String(u.email ?? ''),
      };
    }
  } catch (e) {
    console.error('[loadProfileHybrid] client', e);
  }
  return null;
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (): Promise<FirestoreUserProfile | null> => {
    const u = auth.currentUser;
    if (!u) {
      setProfile(null);
      return null;
    }
    const p = await loadProfileHybrid(u, true);
    setProfile(p);
    return p;
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  // Hybrid load + real-time `users/{uid}` listener (instant UI when Telegram / admin updates the doc).
  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubDoc: (() => void) | undefined;

    void (async () => {
      setLoading(true);
      const p = await loadProfileHybrid(firebaseUser, false);
      if (cancelled) return;
      setProfile(p);
      setLoading(false);

      const userRef = doc(db, 'users', firebaseUser.uid);
      unsubDoc = onSnapshot(
        userRef,
        (snap) => {
          if (cancelled) return;
          if (!snap.exists()) {
            setProfile(null);
            return;
          }
          const data = snap.data() as Record<string, unknown>;
          setProfile(profileFromUserDoc(data, firebaseUser.email ?? ''));
        },
        (err) => {
          // Rules denial or network: keep last profile from hybrid; manual refresh still works.
          console.error('[FirebaseAuth] users onSnapshot', err);
        }
      );
    })();

    return () => {
      cancelled = true;
      unsubDoc?.();
    };
  }, [firebaseUser]);

  const signOutApp = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const isPaid = profile?.paymentStatus === 'paid';
  const isAuthenticated = Boolean(firebaseUser);
  const isNewUser = isAuthenticated && !isPaid;

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      isAuthenticated,
      isNewUser,
      isPaid,
      loading,
      refreshProfile,
      signOutApp,
    }),
    [firebaseUser, profile, isAuthenticated, isNewUser, isPaid, loading, refreshProfile]
  );

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth() {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return ctx;
}
