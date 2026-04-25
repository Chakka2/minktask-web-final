import { adminDb } from '@/lib/firebaseAdmin';

function random7() {
  return String(Math.floor(1_000_000 + Math.random() * 9_000_000));
}

export async function allocateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = random7();
    const snap = await adminDb.collection('users').where('referralCode', '==', code).limit(1).get();
    if (snap.empty) return code;
  }
  return `r_${Date.now().toString(36)}`;
}
