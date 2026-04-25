import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  adminDb,
  FIREBASE_ADMIN_MISSING_MESSAGE,
  FIREBASE_ADMIN_PEM_FAILED_MESSAGE,
  getFirebaseAdminBootStatus,
  isFirebaseAdminConfigured,
} from '@/lib/firebaseAdmin';
import { ENTRY_BASE_AMOUNT, ENTRY_VPA, REEL_BUNDLE_PRICE } from '@/lib/constants';

export type EntryPlan = 'refer' | 'reel';

export async function POST(req: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured) {
      const boot = getFirebaseAdminBootStatus();
      if (boot.envLooksComplete && boot.certError) {
        return NextResponse.json(
          { error: FIREBASE_ADMIN_PEM_FAILED_MESSAGE, code: 'FIREBASE_ADMIN_CERT_FAILED' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: FIREBASE_ADMIN_MISSING_MESSAGE, code: 'FIREBASE_ADMIN_MISSING' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { userId, referredBy, referralCode } = body;
    const rawPlan = String(body.plan ?? body.offer ?? '').toLowerCase();
    const plan: EntryPlan = rawPlan === 'reel' ? 'reel' : 'refer';

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const intentRef = adminDb.collection('entryIntents').doc(userId);
    const paymentRef = adminDb.collection('payments').doc(userId);
    const reelPayRef = adminDb.collection('reelAccessPayments').doc(userId);

    const [intentSnap, paymentSnap, reelPaySnap] = await Promise.all([
      intentRef.get(),
      paymentRef.get(),
      reelPayRef.get(),
    ]);

    const expectedAmount = plan === 'reel' ? REEL_BUNDLE_PRICE : ENTRY_BASE_AMOUNT;
    if (!intentSnap.exists) {
      await intentRef.set(
        {
          userId,
          plan,
          randomPaise: 0,
          expectedAmount,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await intentRef.set(
        {
          plan,
          expectedAmount,
          randomPaise: 0,
        },
        { merge: true }
      );
    }
    const entryConfirmed = paymentSnap.exists && paymentSnap.data()?.status === 'confirmed';
    const reelConfirmed = reelPaySnap.exists && reelPaySnap.data()?.status === 'confirmed';

    const userSnap = await userRef.get();
    const existingRef = userSnap.data()?.referredBy ?? null;
    let resolvedRef: string | null = null;
    if (typeof referredBy === 'string' && referredBy.trim()) {
      const incoming = referredBy.trim();
      if (incoming === userId) {
        resolvedRef = null;
      } else if (/^\d{7}$/.test(incoming)) {
        const refSnap = await adminDb
          .collection('users')
          .where('referralCode', '==', incoming)
          .limit(1)
          .get();
        resolvedRef = refSnap.empty ? null : String(refSnap.docs[0].id);
      } else {
        resolvedRef = incoming;
      }
    }
    const nextRef = existingRef || resolvedRef;

    const joinOffer: 'refer' | 'reel' = plan === 'reel' ? 'reel' : 'refer';

    const userPatch: Record<string, unknown> = {
      userId,
      referredBy: nextRef,
      joinOffer,
      referralCode:
        typeof referralCode === 'string' && /^\d{7}$/.test(referralCode)
          ? referralCode
          : userSnap.data()?.referralCode ?? null,
      isLocked: !entryConfirmed,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (!userSnap.exists) {
      userPatch.walletBalance = 0;
    }

    await userRef.set(userPatch, { merge: true });

    return NextResponse.json({
      userId,
      plan,
      expectedAmount,
      vpa: ENTRY_VPA,
      isLocked: !entryConfirmed,
      entryConfirmed,
      reelConfirmed,
    });
  } catch (error) {
    const code = (error as { code?: string | number })?.code;
    if (code === 16 || code === '16') {
      console.error('entry init auth error', error);
      return NextResponse.json(
        { error: FIREBASE_ADMIN_PEM_FAILED_MESSAGE, code: 'FIREBASE_ADMIN_AUTH_FAILED' },
        { status: 503 }
      );
    }
    console.error('entry init error', error);
    const msg =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to initialize entry payment';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
