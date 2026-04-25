import type { QuerySnapshot } from 'firebase-admin/firestore';

/** Net balance from Firestore transaction docs (credits positive, withdrawal_request negative). */
export function sumLedgerFromTransactions(txSnap: QuerySnapshot): number {
  let sum = 0;
  for (const d of txSnap.docs) {
    sum += Number(d.data().amount ?? 0);
  }
  return Math.round(sum * 100) / 100;
}
