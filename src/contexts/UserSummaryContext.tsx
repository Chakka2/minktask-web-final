'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SummaryTransaction = {
  id: string;
  type: 'credit' | 'debit';
  source: 'referral' | 'bundle' | 'withdrawal' | 'system';
  level: number | null;
  amount: number;
  desc: string;
  date: string;
  createdAtMs: number;
};

export type ChartPoint = {
  date?: string;
  month?: string;
  period?: string;
  referral: number;
  bundle: number;
  total: number;
};

export type UserSummaryPayload = {
  walletBalance: number;
  pendingWithdrawal: number;
  totalWithdrawn: number;
  paidWithdrawalCount: number;
  referralCount: number;
  bundleReferralSales: number;
  bundleSalesThisMonth: number;
  referralEarnings: number;
  bundleEarnings: number;
  bonusEarnings: number;
  totalLifetimeCredits: number;
  todayCredits: number;
  thisMonthCredits: number;
  referralThisMonth: number;
  bundleThisMonth: number;
  chartDaily: ChartPoint[];
  chartMonthly: ChartPoint[];
  chartWeekly: ChartPoint[];
  chartMax: number;
  transactions: SummaryTransaction[];
};

const defaultSummary: UserSummaryPayload = {
  walletBalance: 0,
  pendingWithdrawal: 0,
  totalWithdrawn: 0,
  paidWithdrawalCount: 0,
  referralCount: 0,
  bundleReferralSales: 0,
  bundleSalesThisMonth: 0,
  referralEarnings: 0,
  bundleEarnings: 0,
  bonusEarnings: 0,
  totalLifetimeCredits: 0,
  todayCredits: 0,
  thisMonthCredits: 0,
  referralThisMonth: 0,
  bundleThisMonth: 0,
  chartDaily: [],
  chartMonthly: [],
  chartWeekly: [],
  chartMax: 1,
  transactions: [],
};

type UserSummaryContextValue = {
  summary: UserSummaryPayload;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const UserSummaryContext = createContext<UserSummaryContextValue | null>(null);

export function UserSummaryProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [summary, setSummary] = useState<UserSummaryPayload>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setSummary(defaultSummary);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/user/summary?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Could not load wallet');
        setSummary(defaultSummary);
        return;
      }
      setError(null);
      setSummary({
        walletBalance: Number(data.walletBalance ?? 0),
        pendingWithdrawal: Number(data.pendingWithdrawal ?? 0),
        totalWithdrawn: Number(data.totalWithdrawn ?? 0),
        paidWithdrawalCount: Number(data.paidWithdrawalCount ?? 0),
        referralCount: Number(data.referralCount ?? 0),
        bundleReferralSales: Number(data.bundleReferralSales ?? 0),
        bundleSalesThisMonth: Number(data.bundleSalesThisMonth ?? 0),
        referralEarnings: Number(data.referralEarnings ?? 0),
        bundleEarnings: Number(data.bundleEarnings ?? 0),
        bonusEarnings: Number(data.bonusEarnings ?? 0),
        totalLifetimeCredits: Number(data.totalLifetimeCredits ?? 0),
        todayCredits: Number(data.todayCredits ?? 0),
        thisMonthCredits: Number(data.thisMonthCredits ?? 0),
        referralThisMonth: Number(data.referralThisMonth ?? 0),
        bundleThisMonth: Number(data.bundleThisMonth ?? 0),
        chartDaily: Array.isArray(data.chartDaily) ? data.chartDaily : [],
        chartMonthly: Array.isArray(data.chartMonthly) ? data.chartMonthly : [],
        chartWeekly: Array.isArray(data.chartWeekly) ? data.chartWeekly : [],
        chartMax: Math.max(1, Number(data.chartMax ?? 1)),
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
      });
    } catch {
      setError('Network error');
      setSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      setLoading(true);
      void load();
    };
    window.addEventListener('earnhub-wallet-refresh', onRefresh);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    const t = window.setInterval(() => void load(), 45_000);
    return () => {
      window.removeEventListener('earnhub-wallet-refresh', onRefresh);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(t);
    };
  }, [load]);

  const value = useMemo(
    () => ({
      summary,
      loading,
      error,
      refresh: () => {
        setLoading(true);
        void load();
      },
    }),
    [summary, loading, error, load]
  );

  return <UserSummaryContext.Provider value={value}>{children}</UserSummaryContext.Provider>;
}

export function useUserSummary() {
  const ctx = useContext(UserSummaryContext);
  if (!ctx) {
    throw new Error('useUserSummary must be used within UserSummaryProvider');
  }
  return ctx;
}
