/**
 * Single source of truth for “entry / paid access” flags on `users/{uid}` (client + server).
 * Telegram approval and Admin repair write the same shape so UI updates stay consistent.
 *
 * Firestore rules: for real-time `onSnapshot` on `users/{uid}`, authenticated users must be
 * allowed to read their own document, e.g.
 *   `match /users/{uid} { allow read: if request.auth != null && request.auth.uid == uid; }`
 * (Add rules for other collections your app reads from the client, e.g. support / withdrawals.)
 */
export type FirestoreUserProfile = {
  paymentStatus: 'paid' | 'unpaid' | string;
  email: string;
  referralCode?: string;
};

export function isUserDocPaid(d: Record<string, unknown> | null | undefined): boolean {
  if (!d) return false;
  const ps = String(d.paymentStatus ?? '');
  if (ps === 'paid') return true;
  if (d.isLocked === false) return true;
  if (d.isPaid === true) return true;
  if (String(d.status ?? '') === 'active') return true;
  return false;
}

/** Map a Firestore `users` document to the profile shape used in AuthContext / AppLayout. */
export function profileFromUserDoc(
  d: Record<string, unknown>,
  fallbackEmail: string
): FirestoreUserProfile {
  const email = String(d.email ?? fallbackEmail ?? '');
  const referralCode = typeof d.referralCode === 'string' ? d.referralCode : undefined;
  const paid = isUserDocPaid(d);
  return {
    paymentStatus: paid ? 'paid' : String(d.paymentStatus ?? '') || 'unpaid',
    email,
    referralCode,
  };
}
