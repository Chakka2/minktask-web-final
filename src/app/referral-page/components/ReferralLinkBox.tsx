'use client';

import React, { useMemo, useState } from 'react';
import { Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { getReferralCode } from '@/lib/user';
import { ENTRY_BASE_AMOUNT, ENTRY_REFERRAL_L1, ENTRY_REFERRAL_L2, ENTRY_REFERRAL_L3, ENTRY_REFERRAL_L4, REEL_BUNDLE_PRICE, REEL_REFERRAL_COMMISSION } from '@/lib/constants';

function siteBase() {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : '';
  if (raw) return raw.replace(/\/$/, '');
  return 'https://www.mintytask.online';
}

export default function ReferralLinkBox() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { profile } = useFirebaseAuth();
  const referralCode =
    profile?.referralCode && /^\d{7}$/.test(profile.referralCode) ? profile.referralCode : getReferralCode();

  const referLink = useMemo(
    () => `${siteBase()}/landing-page?ref=${encodeURIComponent(referralCode)}`,
    [referralCode]
  );
  const reelLink = useMemo(
    () =>
      `${siteBase()}/landing-page?ref=${encodeURIComponent(referralCode)}&for=reel`,
    [referralCode]
  );

  const copy = (key: 'refer' | 'reel', url: string) => {
    navigator.clipboard?.writeText(url)?.then(() => {
      setCopiedKey(key);
      toast?.success('Link copied');
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const whatsappRefer = () => {
    const msg = encodeURIComponent(
      `Join MintyTask — Refer & earn ₹${ENTRY_BASE_AMOUNT} one-time. You earn ₹${ENTRY_REFERRAL_L1}, ₹${ENTRY_REFERRAL_L2}, ₹${ENTRY_REFERRAL_L3}, ₹${ENTRY_REFERRAL_L4} across 4 levels. My link: ${referLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const whatsappReel = () => {
    const msg = encodeURIComponent(
      `Get the MintyTask reel bundle — ₹${REEL_BUNDLE_PRICE} one-time, 100k+ reels. I earn ₹${REEL_REFERRAL_COMMISSION} when you buy with my link: ${reelLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-6 md:p-8">
        <h2 className="text-sm font-semibold text-white/80 mb-1">Refer &amp; earn link</h2>
        <p className="text-xs text-white/40 mb-4 leading-relaxed">
          When they join with this link and pay ₹{ENTRY_BASE_AMOUNT}, you earn ₹{ENTRY_REFERRAL_L1} direct and ₹
          {ENTRY_REFERRAL_L2} / ₹{ENTRY_REFERRAL_L3} / ₹{ENTRY_REFERRAL_L4} on deeper levels.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            className="flex-1 flex items-center gap-2 p-3 rounded-xl min-w-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="flex-1 text-xs sm:text-sm text-white/75 font-mono truncate">{referLink}</span>
            <button
              type="button"
              onClick={() => copy('refer', referLink)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                copiedKey === 'refer' ? 'text-emerald-400' : 'text-blue-400 hover:bg-blue-500/10'
              }`}
            >
              {copiedKey === 'refer' ? <Check size={13} /> : <Copy size={13} />}
              {copiedKey === 'refer' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={whatsappRefer}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
            style={{
              background: 'rgba(37,211,102,0.12)',
              border: '1px solid rgba(37,211,102,0.22)',
              color: '#4ade80',
            }}
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <h2 className="text-sm font-semibold text-white/80 mb-1">Reel bundle link</h2>
        <p className="text-xs text-white/40 mb-4 leading-relaxed">
          When they buy the ₹{REEL_BUNDLE_PRICE} reel pack with this link, you earn ₹{REEL_REFERRAL_COMMISSION} per paid
          buyer (direct only).
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            className="flex-1 flex items-center gap-2 p-3 rounded-xl min-w-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="flex-1 text-xs sm:text-sm text-white/75 font-mono truncate">{reelLink}</span>
            <button
              type="button"
              onClick={() => copy('reel', reelLink)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                copiedKey === 'reel' ? 'text-emerald-400' : 'text-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              {copiedKey === 'reel' ? <Check size={13} /> : <Copy size={13} />}
              {copiedKey === 'reel' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={whatsappReel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
            style={{
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.22)',
              color: '#67e8f9',
            }}
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>
        </div>
      </div>

      <p className="text-[11px] text-white/30 px-1">
        Your code: <span className="font-mono text-white/45">{referralCode}</span>
      </p>
    </div>
  );
}
