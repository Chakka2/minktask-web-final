import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebaseAdmin';
import { allocateUniqueReferralCode } from '@/lib/adminReferralCode';
import { ENTRY_BASE_AMOUNT, REEL_BUNDLE_PRICE, REFERRED_JOIN_BONUS } from '@/lib/constants';
import { resolveReferredByToUserId } from '@/lib/referralResolve';

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

/**
 * `payments.amount` is sometimes missing or wrong after manual approve; `entryIntents.expectedAmount` is the
 * unique amount shown on the QR (currently around ₹29.xx). Also allow legacy ~₹99 confirmations.
 */
function resolveConfirmedEntryAmount(
  rawPaid: number,
  expectedFromIntent: number
): { amount: number; ok: boolean } {
  const hasRaw = Number.isFinite(rawPaid) && rawPaid > 0;
  const hasExpected = Number.isFinite(expectedFromIntent) && expectedFromIntent > 0;

  const paid = hasRaw ? rawPaid : hasExpected ? expectedFromIntent : 0;
  if (!Number.isFinite(paid) || paid <= 0) {
    return { amount: 0, ok: false };
  }

  const tol = 0.05;
  /** Reject reel-only amounts so ₹49 bundle payments cannot unlock Refer & earn signup. */
  const isReelOnlyAmount =
    paid >= REEL_BUNDLE_PRICE - tol && paid <= REEL_BUNDLE_PRICE + tol && Math.abs(paid - ENTRY_BASE_AMOUNT) > 1;
  const meetsCurrent =
    paid >= ENTRY_BASE_AMOUNT - 0.01 && paid <= ENTRY_BASE_AMOUNT + tol && !isReelOnlyAmount;
  const meetsIntent =
    hasExpected && paid >= expectedFromIntent - tol && paid <= expectedFromIntent + tol && !isReelOnlyAmount;
  const LEGACY = 99;
  const meetsLegacy = paid >= LEGACY - 0.01 && paid <= LEGACY + 1.5;

  if (meetsCurrent || meetsIntent || meetsLegacy) {
    return { amount: paid, ok: true };
  }
  return { amount: paid, ok: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(String(body.email ?? ''));
    const password = String(body.password ?? '');
    const deviceUserId = String(body.deviceUserId ?? '').trim();
    const referredByRaw = typeof body.referredBy === 'string' ? body.referredBy.trim() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!deviceUserId) {
      return NextResponse.json({ error: 'deviceUserId required' }, { status: 400 });
    }

    const [paySnap, intentSnap] = await Promise.all([
      adminDb.collection('payments').doc(deviceUserId).get(),
      adminDb.collection('entryIntents').doc(deviceUserId).get(),
    ]);
    if (!paySnap.exists || String(paySnap.data()?.status ?? '') !== 'confirmed') {
      return NextResponse.json(
        {
          error:
            'Your joining payment is not confirmed yet. Pay using the QR on the home page in this same browser, wait for approval, then try again.',
          code: 'PAYMENT_PENDING',
        },
        { status: 400 }
      );
    }
    const rawPaid = Number(paySnap.data()?.amount ?? 0);
    const expectedFromIntent = intentSnap.exists ? Number(intentSnap.data()?.expectedAmount ?? NaN) : NaN;
    const { amount: paidAmount, ok: amountOk } = resolveConfirmedEntryAmount(rawPaid, expectedFromIntent);
    if (!amountOk) {
      return NextResponse.json({ error: 'Confirmed payment amount is too low.' }, { status: 400 });
    }

    try {
      await getAuth().getUserByEmail(email);
      return NextResponse.json(
        { error: 'This email is already registered. Please sign in.', code: 'EMAIL_TAKEN' },
        { status: 409 }
      );
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'auth/user-not-found') {
        throw e;
      }
    }

    let resolvedRef: string | null = null;
    if (referredByRaw) {
      resolvedRef = await resolveReferredByToUserId(referredByRaw, { selfUserId: deviceUserId });
    }
    if (!resolvedRef) {
      const deviceUserSnap = await adminDb.collection('users').doc(deviceUserId).get();
      const dr = deviceUserSnap.data()?.referredBy;
      if (typeof dr === 'string' && dr.trim() && dr !== deviceUserId) {
        resolvedRef = await resolveReferredByToUserId(dr, { selfUserId: deviceUserId });
      }
    }
    const joinBonus = resolvedRef ? REFERRED_JOIN_BONUS : 0;

    const userRecord = await getAuth().createUser({
      email,
      password,
      emailVerified: false,
    });
    const uid = userRecord.uid;

    const referralCode = await allocateUniqueReferralCode();
    const batch = adminDb.batch();
    batch.set(
      adminDb.collection('users').doc(uid),
      {
        userId: uid,
        email,
        paymentStatus: 'paid',
        paymentAmount: paidAmount,
        isPaid: true,
        status: 'active',
        activatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        isLocked: false,
        referralCode,
        referredBy: resolvedRef,
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
        sourceId: resolvedRef,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    batch.set(
      adminDb.collection('payments').doc(uid),
      {
        userId: uid,
        amount: paidAmount,
        status: 'confirmed',
        source: 'entry_upi',
        linkedFromEntryUserId: deviceUserId,
        confirmedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    return NextResponse.json({ ok: true, uid });
  } catch (err) {
    console.error('register-after-entry', err);
    const msg = err instanceof Error ? err.message : 'Could not create account';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
