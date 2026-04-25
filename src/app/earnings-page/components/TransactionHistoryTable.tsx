'use client';

import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useUserSummary } from '@/contexts/UserSummaryContext';
import type { SummaryTransaction } from '@/contexts/UserSummaryContext';

type SourceFilter = 'all' | 'earnings' | 'withdrawal' | 'system';

const SOURCE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  earnings: { label: 'Earning', bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc' },
  withdrawal: { label: 'Withdrawal', bg: 'rgba(239,68,68,0.12)', color: '#fca5a5' },
  system: { label: 'Other', bg: 'rgba(148,163,184,0.12)', color: '#cbd5e1' },
};

function rowSourceStyle(txn: SummaryTransaction) {
  if (txn.source === 'referral' || txn.source === 'bundle') return SOURCE_STYLES.earnings;
  return SOURCE_STYLES[txn.source] ?? SOURCE_STYLES.system;
}

const ITEMS_PER_PAGE = 8;

export default function TransactionHistoryTable() {
  const { summary, loading } = useUserSummary();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const list = summary.transactions;
    return list
      .filter((t) => {
        const matchSearch =
          t.desc.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
        const isEarning = t.source === 'referral' || t.source === 'bundle';
        const matchSource =
          sourceFilter === 'all' ||
          (sourceFilter === 'earnings' && isEarning) ||
          (sourceFilter !== 'earnings' && t.source === sourceFilter);
        return matchSearch && matchSource;
      })
      .sort((a, b) => {
        const da = a.createdAtMs;
        const db = b.createdAtMs;
        return sortDir === 'desc' ? db - da : da - db;
      });
  }, [summary.transactions, search, sourceFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleFilterChange = (f: SourceFilter) => {
    setSourceFilter(f);
    setPage(1);
  };

  const filterLabels: { id: SourceFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'withdrawal', label: 'Withdrawals' },
    { id: 'system', label: 'Other' },
  ];

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h3 className="text-base font-semibold text-white">Transaction History</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field pl-8 py-2 text-xs w-36"
              aria-label="Search transactions"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {filterLabels.map(({ id, label }) => (
              <button
                key={`txn-filter-${id}`}
                onClick={() => handleFilterChange(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sourceFilter === id ? 'gradient-bg text-white' : 'text-white/40 hover:text-white hover:bg-white/8'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-white/40 py-8 text-center">Loading transactions…</p>}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left text-xs font-semibold text-white/40 pb-3 pr-4 uppercase tracking-wider">Description</th>
                <th className="text-left text-xs font-semibold text-white/40 pb-3 pr-4 uppercase tracking-wider">Type</th>
                <th
                  className="text-left text-xs font-semibold text-white/40 pb-3 pr-4 uppercase tracking-wider cursor-pointer select-none hover:text-white/70 transition-colors"
                  onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
                >
                  <span className="flex items-center gap-1">
                    Date
                    {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </span>
                </th>
                <th className="text-right text-xs font-semibold text-white/40 pb-3 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-white/30">
                    No transactions match your filter
                  </td>
                </tr>
              ) : (
                paginated.map((txn) => <TxnRow key={txn.id} txn={txn} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            Showing {filtered.length === 0 ? 0 : Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–
            {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} transactions
          </p>
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={`page-${p}`}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${page === p ? 'gradient-bg text-white' : 'text-white/40 hover:text-white hover:bg-white/8'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TxnRow({ txn }: { txn: SummaryTransaction }) {
  const style = rowSourceStyle(txn);
  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-all">
      <td className="py-3 pr-4">
        <p className="text-sm text-white/80">{txn.desc}</p>
        <p className="text-xs text-white/30 mt-0.5 font-mono">{txn.id}</p>
      </td>
      <td className="py-3 pr-4">
        <span className="status-badge" style={{ background: style.bg, color: style.color }}>
          {style.label}
          {txn.level ? ` L${txn.level}` : ''}
        </span>
      </td>
      <td className="py-3 pr-4 text-sm text-white/50 font-mono">{txn.date}</td>
      <td
        className={`py-3 text-right text-sm font-bold font-mono tabular-nums ${txn.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}
      >
        {txn.type === 'credit' ? '+' : '−'}₹{txn.amount.toFixed(2)}
      </td>
    </tr>
  );
}
