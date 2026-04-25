/**
 * Build NPCI-style UPI deep links with correctly encoded query parameters.
 * Raw strings in QR payloads often fail in PhonePe / GPay / Paytm with "unable to verify".
 */
export function buildUpiPayUri(opts: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  currency?: string;
}): string {
  const cu = opts.currency ?? 'INR';
  const am = Number.isFinite(opts.amount) ? opts.amount.toFixed(2) : '0.00';
  let tn = opts.transactionNote.replace(/\s+/g, ' ').trim();
  if (tn.length > 50) tn = tn.slice(0, 50);
  const params = new URLSearchParams();
  params.set('pa', opts.payeeVpa.trim());
  params.set('pn', opts.payeeName.trim());
  params.set('am', am);
  params.set('cu', cu);
  if (tn) params.set('tn', tn);
  return `upi://pay?${params.toString()}`;
}
