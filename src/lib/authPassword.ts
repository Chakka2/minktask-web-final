/** Normalizes password for storage and comparison (trim + Unicode compatibility). */
export function normalizePassword(password: string): string {
  return String(password ?? '').normalize('NFKC').trim();
}
