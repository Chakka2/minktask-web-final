import { ENTRY_VPA } from '@/lib/constants';
import { buildUpiPayUri } from '@/lib/upi';

/**
 * Replace placeholders in a payment URL copied from a merchant / Paytm QR.
 * - {{amount}} → exact rupee amount (e.g. 99.00), same behaviour as before
 * - {{note}} or {{tn}} → URL-encoded transaction note (short id)
 */
function applyPayUrlTemplate(template: string, amount: number, transactionNote: string): string {
  const am = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  const note = transactionNote.replace(/\s+/g, ' ').trim();
  const noteShort = note.length > 50 ? note.slice(0, 50) : note;
  return template
    .replace(/\{\{\s*amount\s*\}\}/gi, am)
    .replace(/\{\{\s*AMOUNT\s*\}\}/g, am)
    .replace(/\{\{\s*note\s*\}\}/gi, encodeURIComponent(noteShort))
    .replace(/\{\{\s*tn\s*\}\}/gi, encodeURIComponent(noteShort));
}

function readEnv(key: string): string {
  if (typeof process === 'undefined') return '';
  return process.env[key]?.trim() ?? '';
}

/** Paytm/static UPI strings often omit am/cu/tn — append so each user still pays the exact screen amount. */
function appendUpiAmountIfMissing(payload: string, amount: number, transactionNote: string): string {
  if (!payload.startsWith('upi://')) return payload;
  if (/[?&]am=/.test(payload)) return payload;
  const am = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  const note = transactionNote.replace(/\s+/g, ' ').trim();
  const noteShort = note.length > 50 ? note.slice(0, 50) : note;
  const tn = encodeURIComponent(noteShort);
  const sep = payload.includes('?') ? '&' : '?';
  return `${payload}${sep}am=${am}&cu=INR&tn=${tn}`;
}

/**
 * Payload encoded in the entry-payment QR. Uses NEXT_PUBLIC_ENTRY_PAY_QR_URL when set.
 */
export function getEntryPayQrPayload(amount: number, transactionNote: string): string {
  const custom = readEnv('NEXT_PUBLIC_ENTRY_PAY_QR_URL');
  if (custom) {
    if (custom.includes('{{')) return applyPayUrlTemplate(custom, amount, transactionNote);
    return appendUpiAmountIfMissing(custom, amount, transactionNote);
  }
  return buildUpiPayUri({
    payeeVpa: ENTRY_VPA,
    payeeName: 'MintyTask',
    amount,
    transactionNote,
  });
}

/**
 * Payload for reel bundle checkout QR. Uses NEXT_PUBLIC_REEL_PAY_QR_URL, or the same as entry if unset.
 */
export function getReelBundlePayQrPayload(amount: number, transactionNote: string): string {
  const custom =
    readEnv('NEXT_PUBLIC_REEL_PAY_QR_URL') || readEnv('NEXT_PUBLIC_ENTRY_PAY_QR_URL');
  if (custom) {
    if (custom.includes('{{')) return applyPayUrlTemplate(custom, amount, transactionNote);
    return appendUpiAmountIfMissing(custom, amount, transactionNote);
  }
  return buildUpiPayUri({
    payeeVpa: ENTRY_VPA,
    payeeName: 'MintyTask',
    amount,
    transactionNote,
  });
}
