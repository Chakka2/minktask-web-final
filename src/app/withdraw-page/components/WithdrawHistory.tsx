'use client';

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { getClientUserId } from '@/lib/user';

type WithdrawalRow = {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  upiId: string;
  status: 'paid' | 'pending' | 'rejected';
};

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  paid: { label: 'Paid', bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  pending: { label: 'Pending', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  rejected: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#fca5a5' },
};

export default function WithdrawHistory() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);

  useEffect(() => {
    const userId = getClientUserId();
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setRows(
        snap.docs.map((doc) => ({
          id: doc.id,
          amount: doc.data().amount,
          fee: doc.data().fee,
          netAmount: doc.data().netAmount,
          upiId: doc.data().upiId,
          status: doc.data().status,
        })) as WithdrawalRow[]
      );
    });
  }, []);

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-semibold text-white mb-5">Withdrawal History</h3>

      {rows.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-white/30">No withdrawal requests yet</p>
          <p className="text-xs text-white/20 mt-1">Your withdrawal history will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {['Amount', 'UPI ID', 'Requested', 'Processed', 'Status'].map((col) => (
                  <th key={`wd-col-${col}`} className="text-left text-xs font-semibold text-white/40 pb-3 pr-4 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((wd) => {
                const style = STATUS_STYLES[wd.status];
                return (
                  <tr key={wd.id} className="border-b border-white/5 hover:bg-white/3 transition-all">
                    <td className="py-3 pr-4">
                      <p className="text-sm font-bold text-white font-mono tabular-nums">₹{wd.amount}</p>
                      <p className="text-xs text-white/30 font-mono">Net: ₹{wd.netAmount} (−₹{wd.fee} fee)</p>
                    </td>
                    <td className="py-3 pr-4 text-sm text-white/60 font-mono">{wd.upiId}</td>
                    <td className="py-3 pr-4 text-sm text-white/50 font-mono">—</td>
                    <td className="py-3 pr-4 text-sm text-white/50 font-mono">—</td>
                    <td className="py-3">
                      <span className="status-badge" style={{ background: style.bg, color: style.color }}>{style.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}