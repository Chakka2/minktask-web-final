import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  adminDb,
  FIREBASE_ADMIN_MISSING_MESSAGE,
  FIREBASE_ADMIN_PEM_FAILED_MESSAGE,
  getFirebaseAdminBootStatus,
  isFirebaseAdminConfigured,
} from '@/lib/firebaseAdmin';
import { isUserDocPaid } from '@/lib/userProfileFirestore';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required', isLocked: true }, { status: 400 });
  }

  try {
    if (!isFirebaseAdminConfigured) {
      const boot = getFirebaseAdminBootStatus();
      if (boot.envLooksComplete && boot.certError) {
        return NextResponse.json(
          {
            error: FIREBASE_ADMIN_PEM_FAILED_MESSAGE,
            code: 'FIREBASE_ADMIN_CERT_FAILED',
            isLocked: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: FIREBASE_ADMIN_MISSING_MESSAGE, code: 'FIREBASE_ADMIN_MISSING', isLocked: true },
        { status: 503 }
      );
    }

    const [userSnap, paymentSnap] = await Promise.all([
      adminDb.collection('users').doc(userId).get(),
      adminDb.collection('payments').doc(userId).get(),
    ]);
    const u = userSnap.data();
    const uRecord = u ? ({ ...u } as Record<string, unknown>) : null;
    const paymentOk = paymentSnap.exists && paymentSnap.data()?.status === 'confirmed';
    const profilePaid = Boolean(uRecord && isUserDocPaid(uRecord));
    const isConfirmed = Boolean(paymentOk || profilePaid);

    if (isConfirmed) {
      // Keep client + AppLayout in sync with Telegram approval (which already sets these).
      await adminDb
        .collection('users')
        .doc(userId)
        .set(
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

    return NextResponse.json({ isLocked: !isConfirmed, payment: paymentSnap.data() ?? null });
  } catch (e) {
    const code = (e as { code?: string | number })?.code;
    if (code === 16 || code === '16') {
      console.error('entry status auth error', e);
      return NextResponse.json(
        { error: FIREBASE_ADMIN_PEM_FAILED_MESSAGE, code: 'FIREBASE_ADMIN_AUTH_FAILED', isLocked: true },
        { status: 503 }
      );
    }
    console.error('entry status error', e);
    return NextResponse.json({ error: 'Status unavailable', isLocked: true }, { status: 503 });
  }
}
