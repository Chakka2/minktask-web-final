'use client';

import React, { useMemo } from 'react';
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
          <div key={`tooltip-${entry.name}`} className="flex items-center justify-between gap-4">
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

export default function EarningsChart() {
  const { summary, loading } = useUserSummary();
  const data = useMemo(() => {
    const rows = summary.chartDaily?.length ? summary.chartDaily : [];
    if (rows.length) return rows.map((d) => ({ ...d, name: 'Total' }));
    const out: { date: string; total: number; name: string }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({
        date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        total: 0,
        name: 'Total',
      });
    }
    return out;
  }, [summary.chartDaily]);

  const yMax = Math.max(summary.chartMax, ...data.map((d) => d.total), 1);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Daily earnings</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {loading ? 'Loading…' : 'Last 8 days · all rewards combined'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
          <span className="text-xs text-white/50">Total</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradTotalDaily" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, yMax]}
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₹${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total" name="Total" stroke="#818cf8" strokeWidth={2} fill="url(#gradTotalDaily)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
