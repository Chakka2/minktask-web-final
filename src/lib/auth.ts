'use client';

import { normalizePassword } from '@/lib/authPassword';

const AUTH_KEY = 'mintytask_auth_user';
/** Legacy single-account key (migrated once into map). */
const LEGACY_ACCOUNT_KEY = 'mintytask_auth_account';
const ACCOUNTS_MAP_KEY = 'mintytask_auth_accounts_v2';

export type AuthUser = {
  name?: string;
  email: string;
};

export type AuthAccount = {
  email: string;
  password: string;
  name?: string;
};

type AccountsMap = Record<string, { password: string; name?: string }>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readAccountsMap(): AccountsMap {
  try {
    const raw = localStorage.getItem(ACCOUNTS_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AccountsMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccountsMap(map: AccountsMap) {
  localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(map));
}

/** One-time migration from the old single-slot account store. */
function migrateLegacyAccountIfNeeded() {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_ACCOUNT_KEY);
    if (!legacyRaw) return;
    const legacy = JSON.parse(legacyRaw) as AuthAccount;
    if (!legacy?.email || !legacy?.password) {
      localStorage.removeItem(LEGACY_ACCOUNT_KEY);
      return;
    }
    const email = normalizeEmail(legacy.email);
    const map = readAccountsMap();
    if (!map[email]) {
      map[email] = { password: legacy.password, name: legacy.name };
      writeAccountsMap(map);
    }
    localStorage.removeItem(LEGACY_ACCOUNT_KEY);
  } catch {
    try {
      localStorage.removeItem(LEGACY_ACCOUNT_KEY);
    } catch {
      /* noop */
    }
  }
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

/** Register or update credentials for this email (multiple accounts per browser). */
export function registerAccount(account: AuthAccount) {
  migrateLegacyAccountIfNeeded();
  const email = normalizeEmail(account.email);
  const map = readAccountsMap();
  map[email] = {
    password: normalizePassword(account.password),
    name: account.name?.trim() || map[email]?.name,
  };
  writeAccountsMap(map);
}

export function verifyAccount(email: string, password: string): boolean {
  migrateLegacyAccountIfNeeded();
  const key = normalizeEmail(email);
  const row = readAccountsMap()[key];
  const input = normalizePassword(password);
  return !!row && normalizePassword(row.password) === input;
}

export function getAccountProfile(email: string): { name?: string } | null {
  migrateLegacyAccountIfNeeded();
  const row = readAccountsMap()[normalizeEmail(email)];
  if (!row) return null;
  return { name: row.name };
}

export function accountExists(email: string): boolean {
  migrateLegacyAccountIfNeeded();
  return !!readAccountsMap()[normalizeEmail(email)];
}

export function updatePasswordForEmail(email: string, newPassword: string): boolean {
  migrateLegacyAccountIfNeeded();
  const key = normalizeEmail(email);
  const map = readAccountsMap();
  if (!map[key]) return false;
  map[key] = { ...map[key], password: normalizePassword(newPassword) };
  writeAccountsMap(map);
  return true;
}

/** @deprecated Use registerAccount — kept for any stray imports */
export function setAuthAccount(account: AuthAccount) {
  registerAccount(account);
}

/** @deprecated */
export function getAuthAccount(): AuthAccount | null {
  migrateLegacyAccountIfNeeded();
  const map = readAccountsMap();
  const emails = Object.keys(map);
  if (emails.length === 1) {
    const email = emails[0];
    const row = map[email];
    return { email, password: row.password, name: row.name };
  }
  return null;
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
}
