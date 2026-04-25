'use client';

import { auth } from '@/lib/firebaseClient';

const STORAGE_KEY = 'earnhub_user_id';
const REFERRAL_KEY = 'mintytask_ref_code';
let memoryFallbackId: string | null = null;

function newId() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c?.randomUUID) return `u_${c.randomUUID()}`;
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function newReferralCode() {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

/**
 * Signed-in users: Firebase uid. Anonymous pages (e.g. landing UPI): stable per-browser id so entry APIs keep working.
 */
export function getClientUserId() {
  try {
    const uid = auth.currentUser?.uid;
    if (uid) return uid;
  } catch {
    /* noop */
  }
  return getLandingEntryUserId();
}

/**
 * Landing-page entry only: always the per-browser id, never the Firebase uid.
 * Prevents “Entry confirmed” with no QR when you’re logged in as an account that already paid.
 */
export function getLandingEntryUserId() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const generated = newId();
    localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    if (!memoryFallbackId) memoryFallbackId = newId();
    return memoryFallbackId;
  }
}

export function clearClientUserId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  memoryFallbackId = null;
}

export function getReferralCode() {
  try {
    const existing = localStorage.getItem(REFERRAL_KEY);
    if (existing && /^\d{7}$/.test(existing)) return existing;
    const generated = newReferralCode();
    localStorage.setItem(REFERRAL_KEY, generated);
    return generated;
  } catch {
    return newReferralCode();
  }
}
