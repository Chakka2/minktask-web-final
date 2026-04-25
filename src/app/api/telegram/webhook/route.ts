import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { answerCallbackQuery, editTelegramMessage, sendTelegramMessage } from '@/lib/telegram';
import {
  ENTRY_BASE_AMOUNT,
  ENTRY_REFERRAL_L1,
  ENTRY_REFERRAL_L2,
  ENTRY_REFERRAL_L3,
  ENTRY_REFERRAL_L4,
  REEL_REFERRAL_COMMISSION,
} from '@/lib/constants';

const ENTRY_REFERRAL_AMOUNTS = [ENTRY_REFERRAL_L1, ENTRY_REFERRAL_L2, ENTRY_REFERRAL_L3, ENTRY_REFERRAL_L4];

/** Walk payer → L1 → L2 → L3 → L4 referrer user IDs (Firestore doc ids). */
async function resolveEntryReferrerChain(payerId: string): Promise<string[]> {
  const chain: string[] = [];
  let walkId: string = payerId;
  for (let i = 0; i < 4; i++) {
    const snap = await adminDb.collection('users').doc(walkId).get();
    const raw = snap.data()?.referredBy;
    const refId = typeof raw === 'string' ? raw.trim() : '';
    if (!refId || refId === payerId || chain.includes(refId)) break;
    chain.push(refId);
    walkId = refId;
  }
  return chain;
}

async function countNewJoinsToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const snap = await adminDb
    .collection('users')
    .where('createdAt', '>=', Timestamp.fromDate(start))
    .get();
  return snap.size;
}

async function totalRevenue() {
  const payments = await adminDb.collection('payments').where('status', '==', 'confirmed').get();
  const sales = await adminDb.collection('reelSales').get();
  const entryRevenue = payments.docs.reduce((sum, doc) => sum + Number(doc.data().amount ?? 0), 0);
  const reelRevenue = sales.docs.reduce((sum, doc) => sum + Number(doc.data().price ?? 0), 0);
  return { entryRevenue, reelRevenue, total: entryRevenue + reelRevenue };
}

async function getOpsSummary() {
  const [pendingWithdrawals, openSupport, lockedUsers] = await Promise.all([
    adminDb.collection('withdrawals').where('status', '==', 'pending').get(),
    adminDb.collection('supportThreads').get(),
    adminDb.collection('users').where('isLocked', '==', true).get(),
  ]);
  return {
    pendingWithdrawals: pendingWithdrawals.size,
    openSupportThreads: openSupport.size,
    lockedUsers: lockedUsers.size,
  };
}

async function handleAudit(callbackData: string, callbackId: string) {
  const [, userId] = callbackData.split(':');
  const [userSnap, txSnap] = await Promise.all([
    adminDb.collection('users').doc(userId).get(),
    adminDb.collection('transactions').where('userId', '==', userId).get(),
  ]);
  const wallet = Number(userSnap.data()?.walletBalance ?? 0);
  const computed = txSnap.docs.reduce((sum, doc) => sum + Number(doc.data().amount ?? 0), 0);
  const result = Math.abs(wallet - computed) < 0.0001 ? 'PASS' : 'MISMATCH';
  await answerCallbackQuery(callbackId, `Audit ${result}`);
  await sendTelegramMessage(
    `<b>Audit ${result}</b>\nUser: <code>${userId}</code>\nWallet: ₹${wallet.toFixed(
      2
    )}\nLedger: ₹${computed.toFixed(2)}`
  );
}

async function handleReelLandingApprove(token: string, chatId: string, messageId: number, data: Record<string, unknown>) {
  const userId = data.userId as string;
  const amount = Number(data.amount);
  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const alreadyPaid = userSnap.data()?.reelLandingReferralPaid === true;
  const referredByRaw = userSnap.data()?.referredBy;
  const referredBy = typeof referredByRaw === 'string' ? referredByRaw.trim() : '';

  const batch = adminDb.batch();
  batch.update(adminDb.collection('entryPayPending').doc(token), {
    status: 'approved',
    decidedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    adminDb.collection('reelAccessPayments').doc(userId),
    {
      userId,
      amount,
      status: 'confirmed',
      confirmedAt: FieldValue.serverTimestamp(),
      source: 'admin_telegram',
    },
    { merge: true }
  );

  const payerPatch: Record<string, unknown> = {};
  if (!alreadyPaid && referredBy && referredBy !== userId) {
    batch.set(
      adminDb.collection('users').doc(referredBy),
      { walletBalance: FieldValue.increment(REEL_REFERRAL_COMMISSION) },
      { merge: true }
    );
    batch.set(adminDb.collection('transactions').doc(), {
      userId: referredBy,
      type: 'reel_landing_referral',
      amount: REEL_REFERRAL_COMMISSION,
      level: 1,
      sourceId: userId,
      createdAt: FieldValue.serverTimestamp(),
    });
    payerPatch.reelLandingReferralPaid = true;
  }
  if (Object.keys(payerPatch).length) {
    batch.set(userRef, payerPatch, { merge: true });
  }

  await batch.commit();
  await editTelegramMessage(
    chatId,
    messageId,
    `<b>Reel bundle — APPROVED</b>\nUser: <code>${userId}</code>\nAmount: ₹${amount.toFixed(2)}`
  );
}

async function handleEntryApprove(token: string, chatId: string, messageId: number) {
  const ref = adminDb.collection('entryPayPending').doc(token);
  const snap = await ref.get();
  if (!snap.exists) {
    return;
  }
  const data = snap.data()!;
  if (data.status !== 'pending') {
    return;
  }
  const kind = String(data.kind ?? 'entry');
  if (kind === 'reel_landing') {
    await handleReelLandingApprove(token, chatId, messageId, data as Record<string, unknown>);
    return;
  }

  const userId = data.userId as string;
  const amount = Number(data.amount);
  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const alreadyPaidEntryReferrals = userSnap.data()?.entryReferralPaid === true;

  const batch = adminDb.batch();
  batch.update(ref, { status: 'approved', decidedAt: FieldValue.serverTimestamp() });
  batch.set(adminDb.collection('payments').doc(userId), {
    userId,
    amount,
    status: 'confirmed',
    confirmedAt: FieldValue.serverTimestamp(),
    source: 'admin_telegram',
  });

  const userPatch: Record<string, unknown> = {
    isLocked: false,
    paymentStatus: 'paid',
    paymentAmount: Number.isFinite(amount) && amount > 0 ? amount : ENTRY_BASE_AMOUNT,
    isPaid: true,
    status: 'active',
    activatedAt: FieldValue.serverTimestamp(),
  };
  if (!alreadyPaidEntryReferrals) {
    const chain = await resolveEntryReferrerChain(userId);
    for (let i = 0; i < chain.length; i++) {
      const refId = chain[i];
      const amt = ENTRY_REFERRAL_AMOUNTS[i];
      if (amt == null || amt <= 0) break;
      batch.set(adminDb.collection('users').doc(refId), { walletBalance: FieldValue.increment(amt) }, { merge: true });
      batch.set(adminDb.collection('transactions').doc(), {
        userId: refId,
        type: 'entry_referral',
        amount: amt,
        level: i + 1,
        sourceId: userId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    userPatch.entryReferralPaid = true;
  }

  batch.set(userRef, userPatch, { merge: true });

  await batch.commit();
  await editTelegramMessage(
    chatId,
    messageId,
    `<b>Entry payment — APPROVED</b>\nUser: <code>${userId}</code>\nAmount: ₹${amount.toFixed(2)}`
  );
}

async function handleEntryDeny(token: string, chatId: string, messageId: number) {
  const ref = adminDb.collection('entryPayPending').doc(token);
  const snap = await ref.get();
  if (!snap.exists) {
    return;
  }
  const data = snap.data()!;
  if (data.status !== 'pending') {
    return;
  }
  const userId = data.userId as string;
  const kind = String(data.kind ?? 'entry');
  await ref.update({ status: 'denied', decidedAt: FieldValue.serverTimestamp() });

  if (kind === 'reel_landing') {
    await adminDb.collection('reelAccessPayments').doc(userId).set(
      {
        userId,
        amount: Number(data.amount),
        status: 'denied',
        deniedAt: FieldValue.serverTimestamp(),
        source: 'admin_telegram',
      },
      { merge: true }
    );
    await editTelegramMessage(
      chatId,
      messageId,
      `<b>Reel bundle — DENIED</b>\nUser: <code>${userId}</code>\nAmount: ₹${Number(data.amount).toFixed(2)}`
    );
    return;
  }

  await adminDb.collection('users').doc(userId).set({ isLocked: true }, { merge: true });
  await adminDb.collection('payments').doc(userId).set(
    {
      userId,
      amount: Number(data.amount),
      status: 'denied',
      deniedAt: FieldValue.serverTimestamp(),
      source: 'admin_telegram',
    },
    { merge: true }
  );
  await editTelegramMessage(
    chatId,
    messageId,
    `<b>Entry payment — DENIED</b>\nUser: <code>${userId}</code>\nAmount: ₹${Number(data.amount).toFixed(2)}`
  );
}

async function handleAdminReply(text: string, replySourceText: string | undefined) {
  const match = replySourceText?.match(/\[support:(.+?)\]/);
  if (!match) return;
  const userId = match[1];
  await adminDb.collection('supportThreads').doc(userId).collection('messages').add({
    userId,
    sender: 'support',
    message: text,
    createdAt: Timestamp.now(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (update.callback_query?.data) {
      const data = String(update.callback_query.data);
      const cq = update.callback_query;
      const chatId = String(cq.message?.chat?.id ?? '');
      const messageId = Number(cq.message?.message_id);

      // Acknowledge immediately so Telegram button never keeps spinning.
      await answerCallbackQuery(cq.id, 'Processing...');

      if (data.startsWith('audit:')) {
        await handleAudit(data, cq.id);
      } else if (data.startsWith('eap:')) {
        const token = data.slice(4);
        await handleEntryApprove(token, chatId, messageId);
      } else if (data.startsWith('edn:')) {
        const token = data.slice(4);
        await handleEntryDeny(token, chatId, messageId);
      } else {
        await editTelegramMessage(chatId, messageId, '<b>Unknown action</b>');
      }
      return NextResponse.json({ ok: true });
    }

    const text = update.message?.text as string | undefined;
    if (!text) return NextResponse.json({ ok: true });

    if (text.trim() === '/stats') {
      const [usersSnap, todayJoins, revenue, ops] = await Promise.all([
        adminDb.collection('users').get(),
        countNewJoinsToday(),
        totalRevenue(),
        getOpsSummary(),
      ]);
      await sendTelegramMessage(
        `<b>MintyTask Stats</b>\nTotal Users: ${usersSnap.size}\nNew Joins Today: ${todayJoins}\nEntry Revenue: ₹${revenue.entryRevenue.toFixed(
          2
        )}\nReel Sales Revenue: ₹${revenue.reelRevenue.toFixed(2)}\nTotal Revenue: ₹${revenue.total.toFixed(
          2
        )}\nPending Withdrawals: ${ops.pendingWithdrawals}\nOpen Support Threads: ${ops.openSupportThreads}\nLocked Accounts: ${ops.lockedUsers}`
      );
      return NextResponse.json({ ok: true });
    }

    const replyText = update.message?.reply_to_message?.text as string | undefined;
    if (replyText) {
      await handleAdminReply(text, replyText);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('telegram webhook error', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
