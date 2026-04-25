import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebaseAdmin';
import { ENTRY_BASE_AMOUNT } from '@/lib/constants';

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Payment gateway is not configured.');
  }
  return new Razorpay({ key_id, key_secret });
}

function amountPaise() {
  return Math.round(ENTRY_BASE_AMOUNT * 100);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';

    if (sessionId) {
      const snap = await adminDb.collection('signupSessions').doc(sessionId).get();
      if (!snap.exists) {
        return NextResponse.json({ error: 'Session expired. Start again from sign up.' }, { status: 400 });
      }
      const d = snap.data()!;
      if (d.completed === true) {
        return NextResponse.json({ error: 'This session is no longer valid.' }, { status: 400 });
      }
      const exp = d.expiresAt as Timestamp | undefined;
      if (exp && exp.toMillis() < Date.now()) {
        return NextResponse.json({ error: 'Session expired. Start again from sign up.' }, { status: 400 });
      }
    } else if (idToken) {
      const decoded = await getAuth().verifyIdToken(idToken);
      const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
      if (!userSnap.exists) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 400 });
      }
      const ps = String(userSnap.data()?.paymentStatus ?? '');
      if (ps === 'paid') {
        return NextResponse.json({ error: 'Nothing to complete here.' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Missing session or sign-in.' }, { status: 400 });
    }

    const rp = getRazorpay();
    const receipt = sessionId ? `sg_${sessionId.slice(0, 24)}` : `pay_${Date.now().toString(36)}`;
    const order = await rp.orders.create({
      amount: amountPaise(),
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      payment_capture: true,
    });

    if (sessionId) {
      await adminDb.collection('signupSessions').doc(sessionId).set(
        {
          razorpayOrderId: order.id,
        },
        { merge: true }
      );
    } else if (idToken) {
      const decoded = await getAuth().verifyIdToken(idToken);
      await adminDb.collection('users').doc(decoded.uid).set({ pendingRazorpayOrderId: order.id }, { merge: true });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise(),
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('razorpay order', err);
    const msg = err instanceof Error ? err.message : 'Could not start checkout';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
