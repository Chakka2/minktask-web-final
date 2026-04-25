import { adminDb } from '@/lib/firebaseAdmin';

/** Map `ref` query value (7-digit code or Firestore user id) to referrer document id. */
export async function resolveReferredByToUserId(
  raw: unknown,
  opts?: { selfUserId?: string }
): Promise<string | null> {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (opts?.selfUserId && trimmed === opts.selfUserId) return null;
  if (/^\d{7}$/.test(trimmed)) {
    const snap = await adminDb.collection('users').where('referralCode', '==', trimmed).limit(1).get();
    return snap.empty ? null : snap.docs[0].id;
  }
  return trimmed;
}
