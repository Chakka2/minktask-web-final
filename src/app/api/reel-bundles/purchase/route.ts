import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { ADMIN_PROFIT, REEL_BUNDLE_PRICE, REEL_REFERRAL_COMMISSION } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { buyerId, referrerId, bundleId } = await req.json();
    if (!buyerId || !bundleId) {
      return NextResponse.json({ error: 'buyerId and bundleId are required' }, { status: 400 });
    }

    const saleRef = adminDb.collection('reelSales').doc();
    const batch = adminDb.batch();
    batch.set(saleRef, {
      buyerId,
      referrerId: referrerId || null,
      bundleId,
      price: REEL_BUNDLE_PRICE,
      referralCommission: referrerId ? REEL_REFERRAL_COMMISSION : 0,
      adminProfit: referrerId ? ADMIN_PROFIT : REEL_BUNDLE_PRICE,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (referrerId) {
      const userRef = adminDb.collection('users').doc(referrerId);
      const txRef = adminDb.collection('transactions').doc();
      batch.set(userRef, { walletBalance: FieldValue.increment(REEL_REFERRAL_COMMISSION) }, { merge: true });
      batch.set(txRef, {
        userId: referrerId,
        type: 'reel_commission',
        amount: REEL_REFERRAL_COMMISSION,
        sourceId: saleRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return NextResponse.json({ success: true, saleId: saleRef.id });
  } catch (error) {
    console.error('reel purchase error', error);
    return NextResponse.json({ error: 'Failed to create sale record' }, { status: 500 });
  }
}
