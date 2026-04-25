'use client';

/** Returns null if status could not be read. */
export async function fetchEntryLocked(userId: string): Promise<boolean | null> {
  try {
    const res = await fetch(`/api/entry/status?userId=${encodeURIComponent(userId)}`);
    const data = await res.json().catch(() => ({}));
    if (typeof data?.isLocked !== 'boolean') return null;
    return data.isLocked as boolean;
  } catch {
    return null;
  }
}
