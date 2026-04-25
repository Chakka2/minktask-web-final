'use client';

import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useUserSummary } from '@/contexts/UserSummaryContext';

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-xs space-y-1 min-w-[130px]">
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={`et-${entry.name}`} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }} className="capitalize">
              {entry.name}
            </span>
            <span className="font-mono font-semibold text-white tabular-nums">₹{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function EarningsBreakdownChart() {
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
  const { summary, loading } = useUserSummary();

  const data = useMemo(() => {
    if (view === 'monthly') {
      const rows = summary.chartMonthly?.length ? summary.chartMonthly : [];
      if (rows.length) return rows;
      return [{ month: '—', total: 0 }];
    }
    const rows = summary.chartWeekly?.length ? summary.chartWeekly : [];
    if (rows.length) return rows;
    return [{ period: '—', total: 0 }];
  }, [view, summary.chartMonthly, summary.chartWeekly]);

  const xKey = view === 'monthly' ? 'month' : 'period';
  const yMax = Math.max(summary.chartMax, ...data.map((d) => d.total), 1);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Earnings over time</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {loading ? 'Loading…' : 'All rewards combined — single total per period'}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['monthly', 'weekly'] as const).map((v) => (
            <button
              key={`chart-view-${v}`}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === v ? 'gradient-bg text-white' : 'text-white/40 hover:text-white'}`}
            >
              {v === 'monthly' ? 'Monthly' : 'Weekly'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
          <span className="text-xs text-white/50">Total earnings</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradEarnTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey={xKey} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, yMax]}
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₹${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total" name="Total" stroke="#818cf8" strokeWidth={2} fill="url(#gradEarnTotal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
