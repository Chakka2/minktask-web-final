import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { sumLedgerFromTransactions } from '@/lib/walletLedger';

type SummaryTransaction = {
  id: string;
  type: 'credit' | 'debit';
  source: 'referral' | 'bundle' | 'withdrawal' | 'system';
  level: number | null;
  amount: number;
  desc: string;
  date: string;
  createdAtMs: number;
};

function tsToMs(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (v && typeof v === 'object' && 'toMillis' in v && typeof (v as { toMillis: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (v && typeof v === 'object' && '_seconds' in v) {
    const s = (v as { _seconds: number })._seconds;
    return typeof s === 'number' ? s * 1000 : 0;
  }
  return 0;
}

function formatINDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function istDayKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function lastNISTDayKeys(n: number): string[] {
  const keys: string[] = [];
  const base = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(base - i * 86_400_000);
    keys.push(istDayKey(t.getTime()));
  }
  return keys;
}

function monthLabelFromKey(mk: string): string {
  const [y, m] = mk.split('-').map(Number);
  const mid = Date.UTC(y, m - 1, 15);
  return new Date(mid).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
}

function mapFirestoreTxn(
  id: string,
  data: Record<string, unknown>
): { row: SummaryTransaction; creditReferral: number; creditBundle: number; creditOther: number } {
  const rawType = String(data.type ?? '');
  const amount = Number(data.amount ?? 0);
  const createdAtMs = tsToMs(data.createdAt);

  let source: SummaryTransaction['source'] = 'system';
  let desc = 'Transaction';
  let creditReferral = 0;
  let creditBundle = 0;
  let creditOther = 0;

  if (rawType === 'entry_referral') {
    source = 'referral';
    desc = 'Entry referral commission';
    if (amount > 0) creditReferral = amount;
  } else if (rawType === 'referral_join_bonus') {
    source = 'system';
    desc = 'Referral welcome bonus';
    if (amount > 0) creditOther = amount;
  } else if (rawType === 'reel_commission') {
    source = 'bundle';
    desc = 'Reel bundle sale commission';
    if (amount > 0) creditBundle = amount;
  } else if (rawType === 'withdrawal_request') {
    source = 'withdrawal';
    desc = 'Withdrawal request';
  } else {
    if (amount > 0) creditOther = amount;
    desc = rawType ? rawType.replace(/_/g, ' ') : 'Balance update';
  }

  const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';
  const displayAmount = Math.abs(amount);

  return {
    row: {
      id,
      type,
      source,
      level: null,
      amount: displayAmount,
      desc,
      date: formatINDate(createdAtMs),
      createdAtMs,
    },
    creditReferral,
    creditBundle,
    creditOther,
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const [userSnap, txSnap, wdSnap, refSnap, salesSnap] = await Promise.all([
      userRef.get(),
      adminDb.collection('transactions').where('userId', '==', userId).get(),
      adminDb.collection('withdrawals').where('userId', '==', userId).get(),
      adminDb.collection('users').where('referredBy', '==', userId).get(),
      adminDb.collection('reelSales').where('referrerId', '==', userId).get(),
    ]);

    const storedWallet = Number(userSnap.data()?.walletBalance ?? 0);
    const ledgerBalance = sumLedgerFromTransactions(txSnap);
    const walletBalance = ledgerBalance;

    if (userSnap.exists && Math.abs(ledgerBalance - storedWallet) > 0.02) {
      try {
        await userRef.set({ walletBalance: ledgerBalance }, { merge: true });
      } catch (e) {
        console.warn('[user/summary] walletBalance sync from ledger failed', e);
      }
    }

    let pendingWithdrawal = 0;
    let totalWithdrawn = 0;
    let paidWithdrawalCount = 0;
    for (const d of wdSnap.docs) {
      const st = String(d.data().status ?? '');
      const amt = Number(d.data().amount ?? 0);
      if (st === 'pending') pendingWithdrawal += amt;
      if (st === 'paid') {
        totalWithdrawn += amt;
        paidWithdrawalCount += 1;
      }
    }

    const now = Date.now();
    const todayIST = istDayKey(now);

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const startOfMonthMs = startOfMonth.getTime();

    const rows: SummaryTransaction[] = [];
    let referralEarnings = 0;
    let bundleEarnings = 0;
    let bonusEarnings = 0;
    let todayCredits = 0;
    let thisMonthCredits = 0;
    let referralThisMonth = 0;
    let bundleThisMonth = 0;

    const dailyMap = new Map<string, { referral: number; bundle: number }>();
    const monthlyMap = new Map<string, { referral: number; bundle: number }>();

    const weekBuckets = 6;
    const bucketMs = 7 * 86_400_000;
    const weeklyTotals = Array.from({ length: weekBuckets }, () => ({ referral: 0, bundle: 0 }));

    for (const d of txSnap.docs) {
      const data = d.data() as Record<string, unknown>;
      const { row, creditReferral, creditBundle, creditOther } = mapFirestoreTxn(d.id, data);
      rows.push(row);

      referralEarnings += creditReferral;
      bundleEarnings += creditBundle;
      bonusEarnings += creditOther;

      const ms = row.createdAtMs;
      const creditTotal = creditReferral + creditBundle + creditOther;
      if (creditTotal > 0) {
        if (istDayKey(ms) === todayIST) todayCredits += creditTotal;
        if (ms >= startOfMonthMs) {
          thisMonthCredits += creditTotal;
          referralThisMonth += creditReferral + creditOther;
          bundleThisMonth += creditBundle;
        }

        const dk = istDayKey(ms);
        const curD = dailyMap.get(dk) ?? { referral: 0, bundle: 0 };
        curD.referral += creditReferral + creditOther;
        curD.bundle += creditBundle;
        dailyMap.set(dk, curD);

        const mk = new Date(ms).toISOString().slice(0, 7);
        const curM = monthlyMap.get(mk) ?? { referral: 0, bundle: 0 };
        curM.referral += creditReferral + creditOther;
        curM.bundle += creditBundle;
        monthlyMap.set(mk, curM);

        const age = now - ms;
        const idx = Math.min(weekBuckets - 1, Math.floor(age / bucketMs));
        if (idx >= 0 && idx < weekBuckets) {
          weeklyTotals[idx].referral += creditReferral + creditOther;
          weeklyTotals[idx].bundle += creditBundle;
        }
      }
    }

    rows.sort((a, b) => b.createdAtMs - a.createdAtMs);

    const totalLifetimeCredits = referralEarnings + bundleEarnings + bonusEarnings;

    const last8DayKeys = lastNISTDayKeys(8);

    const chartDaily = last8DayKeys.map((key) => {
      const entry = dailyMap.get(key) ?? { referral: 0, bundle: 0 };
      const [yy, mm, dd] = key.split('-').map(Number);
      const label = new Date(Date.UTC(yy, mm - 1, dd)).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return {
        date: label,
        referral: Math.round(entry.referral * 100) / 100,
        bundle: Math.round(entry.bundle * 100) / 100,
        total: Math.round((entry.referral + entry.bundle) * 100) / 100,
      };
    });

    const last6MonthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - i);
      last6MonthKeys.push(d.toISOString().slice(0, 7));
    }

    const chartMonthly = last6MonthKeys.map((mk) => {
      const entry = monthlyMap.get(mk) ?? { referral: 0, bundle: 0 };
      return {
        month: monthLabelFromKey(mk),
        referral: Math.round(entry.referral * 100) / 100,
        bundle: Math.round(entry.bundle * 100) / 100,
        total: Math.round((entry.referral + entry.bundle) * 100) / 100,
      };
    });

    const chartWeekly = weeklyTotals.map((entry, i) => {
      const end = new Date(now - i * bucketMs);
      const start = new Date(end.getTime() - bucketMs);
      const fmt = (t: Date) =>
        t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      return {
        period: `${fmt(start)} – ${fmt(end)}`,
        referral: Math.round(entry.referral * 100) / 100,
        bundle: Math.round(entry.bundle * 100) / 100,
        total: Math.round((entry.referral + entry.bundle) * 100) / 100,
      };
    });

    let bundleSalesThisMonth = 0;
    for (const doc of salesSnap.docs) {
      const ms = tsToMs(doc.data().createdAt);
      if (ms >= startOfMonthMs) bundleSalesThisMonth += 1;
    }

    const referralCount = refSnap.size;
    const bundleReferralSales = salesSnap.size;

    const yMax = Math.max(
      1,
      ...chartDaily.map((d) => d.total),
      ...chartMonthly.map((d) => d.total),
      ...chartWeekly.map((d) => d.total)
    );

    return NextResponse.json({
      walletBalance: Math.round(walletBalance * 100) / 100,
      pendingWithdrawal: Math.round(pendingWithdrawal * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      paidWithdrawalCount,
      referralCount,
      bundleReferralSales,
      bundleSalesThisMonth,
      referralEarnings: Math.round(referralEarnings * 100) / 100,
      bundleEarnings: Math.round(bundleEarnings * 100) / 100,
      bonusEarnings: Math.round(bonusEarnings * 100) / 100,
      totalLifetimeCredits: Math.round(totalLifetimeCredits * 100) / 100,
      todayCredits: Math.round(todayCredits * 100) / 100,
      thisMonthCredits: Math.round(thisMonthCredits * 100) / 100,
      referralThisMonth: Math.round(referralThisMonth * 100) / 100,
      bundleThisMonth: Math.round(bundleThisMonth * 100) / 100,
      chartDaily,
      chartMonthly,
      chartWeekly,
      chartMax: yMax,
      transactions: rows.slice(0, 300),
    });
  } catch (error) {
    console.error('user summary error', error);
    return NextResponse.json({ error: 'Summary unavailable' }, { status: 503 });
  }
}
