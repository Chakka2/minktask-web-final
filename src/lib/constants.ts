export const ENTRY_VPA = '9529586536@ibl';
/** One-time joining fee (includes All Reel Bundle Pack access after payment). */
export const ENTRY_BASE_AMOUNT = 29;
/** Level 1 (direct) entry commission when a referred user completes joining payment. */
export const ENTRY_REFERRAL_L1 = 20;
/** Level 2 entry commission. */
export const ENTRY_REFERRAL_L2 = 3;
/** Level 3 entry commission. */
export const ENTRY_REFERRAL_L3 = 2;
/** Level 4 entry commission. */
export const ENTRY_REFERRAL_L4 = 1;
/** One-time wallet credit for the new member when they join with a valid referrer. */
export const REFERRED_JOIN_BONUS = 10;
/** @deprecated Use ENTRY_REFERRAL_L1 — kept for imports expecting a single L1 amount. */
export const ENTRY_REFERRAL_COMMISSION = ENTRY_REFERRAL_L1;
/** Public Reel Bundle checkout (landing QR + legacy bundle APIs). */
export const REEL_BUNDLE_PRICE = 49;
/** Commission to direct referrer when someone buys via a reel-focused share link (`?for=reel`). */
export const REEL_REFERRAL_COMMISSION = 25;
export const ADMIN_PROFIT = REEL_BUNDLE_PRICE - REEL_REFERRAL_COMMISSION;
/** Private Telegram community for reel pack buyers (same link after ₹49 payment). */
export const REEL_TELEGRAM_COMMUNITY_URL = 'https://t.me/+PVL4Um3uaohhODBl';
export const WITHDRAW_MIN = 50;
export const WITHDRAW_FEE = 2;

/** Smallest gross amount after the first paid payout (net must stay positive after fee). */
export const WITHDRAW_FLOOR_AFTER_FIRST = WITHDRAW_FEE + 0.01;

/**
 * First withdrawal: minimum ₹50. After at least one completed (paid) payout, users may
 * withdraw down to the fee floor so they can clear the rest of the wallet.
 */
export function getWithdrawRequestMinimum(paidWithdrawalCount: number, _availableBalance: number): number {
  if (paidWithdrawalCount === 0) return WITHDRAW_MIN;
  return WITHDRAW_FLOOR_AFTER_FIRST;
}

export const ALL_REEL_BUNDLE_PACK = {
  id: 'all-reel-pack',
  emoji: '📦',
  name: 'All Reel Bundle Pack',
  tagline: 'One pack — every niche we ship. Share one link, earn on each sale.',
  categories: [
    { emoji: '💪', name: 'Fitness & wellness' },
    { emoji: '😂', name: 'Comedy & entertainment' },
    { emoji: '💼', name: 'Business & finance' },
    { emoji: '✨', name: 'Lifestyle & motivation' },
    { emoji: '🎓', name: 'Education & skills' },
    { emoji: '🤖', name: 'AI & tech reels' },
    { emoji: '🛍️', name: 'Shopping & reviews' },
    { emoji: '🎬', name: 'Cinematic & trends' },
  ],
} as const;

/** @deprecated Use ALL_REEL_BUNDLE_PACK — kept for type compatibility */
export const REEL_BUNDLES = [{ id: ALL_REEL_BUNDLE_PACK.id, emoji: ALL_REEL_BUNDLE_PACK.emoji, name: ALL_REEL_BUNDLE_PACK.name }] as const;
