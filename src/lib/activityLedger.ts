'use client';

const LEDGER_KEY = 'mintytask_activity_ledger';
const ONCE_PREFIX = 'mintytask_ledger_once_';

export type LedgerSource = 'referral' | 'bundle' | 'withdrawal' | 'system';

export type LedgerEntry = {
  id: string;
  type: 'credit' | 'debit';
  source: LedgerSource;
  level?: number | null;
  amount: number;
  desc: string;
  timeLabel: string;
  createdAt: number;
};

function newId() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatLedgerTimeLabel(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function notifyLedgerSubscribers() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('mintytask-ledger-updated'));
}

export function getLedgerEntries(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LedgerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLedger(entries: LedgerEntry[]) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, 200)));
}

export function appendLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'timeLabel' | 'createdAt'> & { id?: string }) {
  const createdAt = Date.now();
  const full: LedgerEntry = {
    id: entry.id ?? newId(),
    type: entry.type,
    source: entry.source,
    level: entry.level ?? null,
    amount: entry.amount,
    desc: entry.desc,
    timeLabel: formatLedgerTimeLabel(createdAt),
    createdAt,
  };
  const prev = getLedgerEntries();
  saveLedger([full, ...prev]);
  notifyLedgerSubscribers();
}

/** Idempotent per browser — e.g. one "entry unlocked" line per userId. */
export function appendLedgerOnce(
  onceKey: string,
  entry: Omit<LedgerEntry, 'id' | 'timeLabel' | 'createdAt'> & { id?: string }
) {
  try {
    const flag = `${ONCE_PREFIX}${onceKey}`;
    if (localStorage.getItem(flag)) return;
    appendLedgerEntry(entry);
    localStorage.setItem(flag, '1');
  } catch {
    /* storage blocked */
  }
}
