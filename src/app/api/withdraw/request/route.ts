import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { WITHDRAW_FEE, getWithdrawRequestMinimum } from '@/lib/constants';
import { sendTelegramMessage } from '@/lib/telegram';
import { sumLedgerFromTransactions } from '@/lib/walletLedger';

export async function POST(req: NextRequest) {
  try {
    const { userId, amount, upiId } = await req.json();
    if (!userId || !amount || !upiId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const userRef = adminDb.collection('users').doc(userId);
    const [userSnap, txSnap, wdSnap] = await Promise.all([
      userRef.get(),
      adminDb.collection('transactions').where('userId', '==', userId).get(),
      adminDb.collection('withdrawals').where('userId', '==', userId).get(),
    ]);
    const userEmail = String(userSnap.data()?.email ?? '');
    const balance = sumLedgerFromTransactions(txSnap);
    let paidWithdrawalCount = 0;
    for (const d of wdSnap.docs) {
      if (String(d.data().status ?? '') === 'paid') paidWithdrawalCount += 1;
    }
    const minWithdraw = getWithdrawRequestMinimum(paidWithdrawalCount, balance);
    if (amountNum < minWithdraw) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₹${minWithdraw.toFixed(2)}` },
        { status: 400 }
      );
    }

    if (balance < amountNum) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    const netAmount = amountNum - WITHDRAW_FEE;
    const withdrawalRef = adminDb.collection('withdrawals').doc();
    const txRef = adminDb.collection('transactions').doc();
    const balanceAfter = Math.round((balance - amountNum) * 100) / 100;
    const batch = adminDb.batch();
    batch.set(userRef, { walletBalance: balanceAfter }, { merge: true });
    batch.set(withdrawalRef, {
      userId,
      amount: amountNum,
      fee: WITHDRAW_FEE,
      netAmount,
      upiId,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(txRef, {
      userId,
      type: 'withdrawal_request',
      amount: -amountNum,
      linkedWithdrawalId: withdrawalRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await sendTelegramMessage(
      `<b>Withdrawal Request</b>\nUser: <code>${userId}</code>\nEmail: <code>${userEmail || '-'}</code>\nWallet Before Request: ₹${balance.toFixed(
        2
      )}\nRequested: ₹${amountNum.toFixed(
        2
      )}\nWallet Check: ${balance >= amountNum ? 'PASS' : 'FAIL'}\nService Charge: ₹${WITHDRAW_FEE.toFixed(2)}\nNet: ₹${netAmount.toFixed(
        2
      )}\nUPI: <code>${upiId}</code>`,
      {
        inline_keyboard: [
          [{ text: 'Audit', callback_data: `audit:${userId}:${withdrawalRef.id}` }],
        ],
      }
    );

    return NextResponse.json({ success: true, netAmount });
  } catch (error) {
    console.error('withdraw request error', error);
    return NextResponse.json({ error: 'Failed to request withdrawal' }, { status: 500 });
  }
}
