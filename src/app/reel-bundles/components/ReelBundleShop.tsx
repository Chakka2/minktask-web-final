'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Copy, ExternalLink, Users } from 'lucide-react';
import { ALL_REEL_BUNDLE_PACK, REEL_TELEGRAM_COMMUNITY_URL } from '@/lib/constants';
import { auth } from '@/lib/firebaseClient';
import { getClientUserId, getReferralCode } from '@/lib/user';
import { toast } from 'sonner';
import { hasBundleCommunityUnlocked, setBundleCommunityUnlocked } from '@/lib/bundleAccess';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

const TELEGRAM_COMMUNITY_URL = REEL_TELEGRAM_COMMUNITY_URL;

export default function ReelBundleShop() {
  const { profile } = useFirebaseAuth();
  const [userId, setUserId] = useState('');
  const referralCode =
    profile?.referralCode && /^\d{7}$/.test(profile.referralCode) ? profile.referralCode : getReferralCode();

  useEffect(() => {
    setUserId(getClientUserId());
    return onAuthStateChanged(auth, () => setUserId(getClientUserId()));
  }, []);
  const [entryUnlocked, setEntryUnlocked] = useState<boolean | null>(null);
  const [communityUnlocked, setCommunityUnlocked] = useState(false);

  const shareLink = () => `https://mintytask.online/?ref=${referralCode}`;

  useEffect(() => {
    setCommunityUnlocked(hasBundleCommunityUnlocked());
    const onBundle = () => setCommunityUnlocked(true);
    window.addEventListener('mintytask-bundle-unlocked', onBundle);
    return () => window.removeEventListener('mintytask-bundle-unlocked', onBundle);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/entry/status?userId=${encodeURIComponent(userId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled || typeof data?.isLocked !== 'boolean') return;
        setEntryUnlocked(!data.isLocked);
      } catch {
        if (!cancelled) setEntryUnlocked(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onCopyLink = async () => {
    const link = shareLink();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      } else {
        throw new Error('Clipboard unavailable');
      }
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy automatically. Please copy this link manually.');
    }
  };

  const onGetAccess = useCallback(() => {
    if (entryUnlocked !== true) {
      toast.error('Complete your ₹29 joining payment on the home page first. Your bundle is included in that fee.');
      return;
    }
    setBundleCommunityUnlocked();
    setCommunityUnlocked(true);
    toast.success('Opening the private Telegram group…');
    window.open(TELEGRAM_COMMUNITY_URL, '_blank', 'noopener,noreferrer');
  }, [entryUnlocked]);

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Reel Bundle Pack</h1>
        <p className="text-sm text-white/50 mt-0.5">
          Included with your ₹29 joining fee — there is no separate &quot;buy bundle&quot; step or QR on this page.
        </p>
      </div>

      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="text-5xl shrink-0">{ALL_REEL_BUNDLE_PACK.emoji}</div>
          <div className="flex-1 min-w-0 space-y-2">
            <h2 className="text-xl font-bold text-white">{ALL_REEL_BUNDLE_PACK.name}</h2>
            <p className="text-sm text-white/50">{ALL_REEL_BUNDLE_PACK.tagline}</p>
            <p className="text-xs text-white/35 pt-1 leading-relaxed">
              After your joining payment is confirmed, use <span className="text-white/60">Get access</span> below to open the private Telegram community with all reel categories and updates.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80 mb-3">Categories included</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_REEL_BUNDLE_PACK.categories.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-2 text-sm text-white/70 rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-lg" aria-hidden>
                  {c.emoji}
                </span>
                <span>{c.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCopyLink}
            className="btn-ghost text-sm inline-flex items-center justify-center gap-2 sm:flex-1"
            title="Copies your referral link to clipboard"
          >
            <Copy size={14} />
            Share link
          </button>
          <button
            type="button"
            onClick={onGetAccess}
            disabled={entryUnlocked === null}
            className="btn-primary text-sm inline-flex items-center justify-center gap-2 sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Users size={14} />
            {entryUnlocked === null ? 'Checking access…' : communityUnlocked ? 'Open Telegram again' : 'Get access'}
          </button>
        </div>

        {entryUnlocked === true && (
          <p className="text-xs text-white/40 text-center sm:text-left">
            <a
              href={TELEGRAM_COMMUNITY_URL}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Join private community (Telegram)
              <ExternalLink size={12} />
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
