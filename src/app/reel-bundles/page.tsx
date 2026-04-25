import { redirect } from 'next/navigation';

/** Reel bundle checkout now lives on the public landing page; paid members share links from Invite & earn. */
export default function ReelBundlesPage() {
  redirect('/referral-page');
}
