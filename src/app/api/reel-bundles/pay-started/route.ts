import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { REEL_BUNDLE_PRICE } from '@/lib/constants';

function uniqueBundleTotal() {
  const paise = Math.floor(Math.random() * 99) + 1;
  return Number((REEL_BUNDLE_PRICE + paise / 100).toFixed(2));
}

export async function POST(req: NextRequest) {
  try {
    const { buyerId, referrerId, bundleId } = await req.json();
    if (!buyerId || !bundleId) {
      return NextResponse.json({ error: 'buyerId and bundleId are required' }, { status: 400 });
    }

    const buyerSnap = await adminDb.collection('users').doc(buyerId).get();
    const storedReferrer = buyerSnap.data()?.referredBy ?? null;
    const effectiveReferrer = referrerId || storedReferrer || null;

    const expectedAmount = uniqueBundleTotal();
    const token = crypto.randomBytes(8).toString('hex');
    await adminDb.collection('entryPayPending').doc(token).set({
      kind: 'reel_bundle',
      buyerId,
      userId: buyerId,
      referrerId: effectiveReferrer,
      bundleId,
      amount: expectedAmount,
      expectedAmount,
      basePrice: REEL_BUNDLE_PRICE,
      status: 'pending',
      alertSent: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, token, expectedAmount });
  } catch (error) {
    console.error('reel pay-started error', error);
    return NextResponse.json({ error: 'Failed to create bundle payment request' }, { status: 500 });
  }
}

