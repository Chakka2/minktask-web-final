import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, KEYLEN);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export function verifyPasswordHash(plain: string, stored: string): boolean {
  const parts = String(stored ?? '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, keyHex] = parts;
  try {
    const derived = scryptSync(plain, salt, KEYLEN);
    return timingSafeEqual(Buffer.from(keyHex, 'hex'), derived);
  } catch {
    return false;
  }
}
