import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebaseAdmin';
import { decryptSignupPassword } from '@/lib/authSessionCrypto';
import { allocateUniqueReferralCode } from '@/lib/adminReferralCode';
import { ENTRY_BASE_AMOUNT, REFERRED_JOIN_BONUS } from '@/lib/constants';
import { resolveReferredByToUserId } from '@/lib/referralResolve';

function verifySignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(String(signature), 'utf8'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    const orderId = String(body.orderId ?? '');
    const paymentId = String(body.paymentId ?? '');
    const signature = String(body.signature ?? '');

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }
    if (!verifySignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: 'Payment could not be verified. Try again.' }, { status: 400 });
    }

    const processedRef = adminDb.collection('processedRazorpayPayments').doc(paymentId);
    const processedSnap = await processedRef.get();
    if (processedSnap.exists) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (sessionId) {
      const sessRef = adminDb.collection('signupSessions').doc(sessionId);
      const sessSnap = await sessRef.get();
      if (!sessSnap.exists) {
        return NextResponse.json({ error: 'Session expired.' }, { status: 400 });
      }
      const s = sessSnap.data()!;
      if (s.completed === true) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      const exp = s.expiresAt as Timestamp | undefined;
      if (exp && exp.toMillis() < Date.now()) {
        return NextResponse.json({ error: 'Session expired.' }, { status: 400 });
      }
      if (String(s.razorpayOrderId ?? '') !== orderId) {
        return NextResponse.json({ error: 'Order mismatch. Start checkout again.' }, { status: 400 });
      }

      const email = String(s.email ?? '').toLowerCase();
      const pwd = decryptSignupPassword({
        iv: String(s.passwordIv),
        tag: String(s.passwordTag),
        ciphertext: String(s.passwordCiphertext),
      });
      const referredByRaw = typeof s.referredBy === 'string' && s.referredBy ? s.referredBy.trim() : '';

      let uid: string;
      try {
        const userRecord = await getAuth().createUser({
          email,
          password: pwd,
          emailVerified: true,
        });
        uid = userRecord.uid;
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === 'auth/email-already-exists') {
          return NextResponse.json(
            { error: 'This email was registered while you were checking out. Please sign in instead.' },
            { status: 409 }
          );
        }
        throw e;
      }

      const referredBy = referredByRaw ? await resolveReferredByToUserId(referredByRaw, { selfUserId: uid }) : null;
      const joinBonus = referredBy ? REFERRED_JOIN_BONUS : 0;
      const referralCode = await allocateUniqueReferralCode();
      const batch = adminDb.batch();
      batch.set(
        adminDb.collection('users').doc(uid),
        {
          userId: uid,
          email,
          paymentStatus: 'paid',
          paymentAmount: ENTRY_BASE_AMOUNT,
          isPaid: true,
          status: 'active',
          activatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          isLocked: false,
          referralCode,
          referredBy,
          walletBalance: joinBonus,
          entryReferralPaid: false,
          referredJoinBonusPaid: joinBonus > 0,
        },
        { merge: true }
      );
      if (joinBonus > 0) {
        batch.set(adminDb.collection('transactions').doc(), {
          userId: uid,
          type: 'referral_join_bonus',
          amount: joinBonus,
          sourceId: referredBy,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      batch.set(
        adminDb.collection('payments').doc(uid),
        {
          userId: uid,
          amount: ENTRY_BASE_AMOUNT,
          status: 'confirmed',
          source: 'razorpay',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          confirmedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batch.set(sessRef, { completed: true, completedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(processedRef, { uid, email, createdAt: FieldValue.serverTimestamp() });
      await batch.commit();

      return NextResponse.json({ ok: true });
    }

    if (!idToken) {
      return NextResponse.json({ error: 'Missing session or sign-in.' }, { status: 400 });
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 400 });
    }
    const u = userSnap.data()!;
    if (String(u.paymentStatus ?? '') === 'paid') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (String(u.pendingRazorpayOrderId ?? '') !== orderId) {
      return NextResponse.json({ error: 'Order mismatch. Start checkout again.' }, { status: 400 });
    }

    const refUid = await resolveReferredByToUserId(u.referredBy, { selfUserId: uid });
    const payJoinBonus =
      refUid && u.referredJoinBonusPaid !== true ? REFERRED_JOIN_BONUS : 0;

    const batch = adminDb.batch();
    const userUpdate: Record<string, unknown> = {
      paymentStatus: 'paid',
      paymentAmount: ENTRY_BASE_AMOUNT,
      isPaid: true,
      status: 'active',
      activatedAt: FieldValue.serverTimestamp(),
      isLocked: false,
      pendingRazorpayOrderId: FieldValue.delete(),
    };
    if (payJoinBonus > 0) {
      userUpdate.walletBalance = FieldValue.increment(payJoinBonus);
      userUpdate.referredJoinBonusPaid = true;
      batch.set(adminDb.collection('transactions').doc(), {
        userId: uid,
        type: 'referral_join_bonus',
        amount: payJoinBonus,
        sourceId: refUid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    batch.set(userRef, userUpdate, { merge: true });
    batch.set(
      adminDb.collection('payments').doc(uid),
      {
        userId: uid,
        amount: ENTRY_BASE_AMOUNT,
        status: 'confirmed',
        source: 'razorpay',
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        confirmedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batch.set(processedRef, { uid, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('razorpay verify', err);
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
