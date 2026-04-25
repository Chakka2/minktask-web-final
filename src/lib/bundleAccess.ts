'use client';

const KEY = 'mintytask_bundle_community_unlocked';

export function setBundleCommunityUnlocked() {
  try {
    localStorage.setItem(KEY, '1');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mintytask-bundle-unlocked'));
    }
  } catch {
    /* noop */
  }
}

export function hasBundleCommunityUnlocked(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
