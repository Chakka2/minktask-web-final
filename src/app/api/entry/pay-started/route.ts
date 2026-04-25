import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import {
  adminDb,
  FIREBASE_ADMIN_MISSING_MESSAGE,
  FIREBASE_ADMIN_PEM_FAILED_MESSAGE,
  getFirebaseAdminBootStatus,
  isFirebaseAdminConfigured,
} from '@/lib/firebaseAdmin';

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

    const { userId, amount, kind } = await req.json();
    if (!userId || amount == null) {
      return NextResponse.json({ error: 'userId and amount required' }, { status: 400 });
    }

    const amt = Number(amount);
    if (Number.isNaN(amt)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const payKind = String(kind ?? 'entry').toLowerCase() === 'reel_landing' ? 'reel_landing' : 'entry';

    const token = crypto.randomBytes(8).toString('hex');
    await adminDb.collection('entryPayPending').doc(token).set({
      userId,
      amount: amt,
      kind: payKind,
      status: 'pending',
      alertSent: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, token });
  } catch (error) {
    console.error('pay-started error', error);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}
