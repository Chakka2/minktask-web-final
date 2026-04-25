import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function sessionKey(): Buffer {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SESSION_SECRET must be set (min 16 chars) for signup sessions');
  }
  return scryptSync(secret, 'earnhub-signup-session', 32);
}

export function encryptSignupPassword(plainPassword: string): { iv: string; tag: string; ciphertext: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, sessionKey(), iv);
  const enc = Buffer.concat([cipher.update(plainPassword, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: enc.toString('hex'),
  };
}

export function decryptSignupPassword(payload: { iv: string; tag: string; ciphertext: string }): string {
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const data = Buffer.from(payload.ciphertext, 'hex');
  const decipher = createDecipheriv(ALGO, sessionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
