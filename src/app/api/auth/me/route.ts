import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebaseAdmin';
import { isUserDocPaid } from '@/lib/userProfileFirestore';

/**
 * Signed-in user profile from Firestore via Admin SDK (not client rules).
 * If `payments/{uid}` is confirmed but `users/{uid}` is still locked/unpaid, repairs the user doc.
 */
export async function GET(req: NextRequest) {
  const raw = req.headers.get('authorization') ?? '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization Bearer token' }, { status: 401 });
  }

  let uid: string;
  let emailFromToken: string;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
    emailFromToken = String(decoded.email ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  try {
    const [userSnap, paySnap] = await Promise.all([
      adminDb.collection('users').doc(uid).get(),
      adminDb.collection('payments').doc(uid).get(),
    ]);

    const payOk = paySnap.exists && String(paySnap.data()?.status ?? '') === 'confirmed';
    const userData = userSnap.exists ? userSnap.data()! : null;
    const u = userData ? ({ ...userData } as Record<string, unknown>) : null;

    let paymentStatus: 'paid' | 'unpaid' = 'unpaid';
    if (u && isUserDocPaid(u)) {
      paymentStatus = 'paid';
    }
    if (payOk) {
      paymentStatus = 'paid';
      if (userSnap.exists && u && !isUserDocPaid(u)) {
        await adminDb.collection('users').doc(uid).set(
          {
            isLocked: false,
            paymentStatus: 'paid',
            isPaid: true,
            status: 'active',
            activatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    const email = String((u?.email as string | undefined) ?? emailFromToken ?? '');
    const referralCode = typeof u?.referralCode === 'string' ? u.referralCode : undefined;

    return NextResponse.json({
      uid,
      email,
      paymentStatus,
      referralCode: referralCode ?? null,
    });
  } catch (e) {
    console.error('[api/auth/me]', e);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
