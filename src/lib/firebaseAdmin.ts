import { getApps, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Normalizes FIREBASE_PRIVATE_KEY from Vercel / .env (common paste mistakes).
 * - Trims; strips UTF-8 BOM
 * - Removes one pair of surrounding " or ' quotes
 * - Turns literal \n (two chars) into real newlines
 */
export function normalizeFirebasePrivateKeyFromEnv(raw: string | undefined): string | undefined {
  if (raw == null || typeof raw !== 'string') return undefined;
  let k = raw.trim();
  if (k.charCodeAt(0) === 0xfeff) {
    k = k.slice(1).trim();
  }
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\\"/g, '"');
  k = k.replace(/\\n/g, '\n');
  k = k.trim();
  if (!k) return undefined;
  if (!k.includes('BEGIN') || !k.includes('PRIVATE KEY')) {
    return undefined;
  }
  return k;
}

function parsePrivateKey() {
  return normalizeFirebasePrivateKeyFromEnv(process.env.FIREBASE_PRIVATE_KEY);
}

function readServiceAccountFromFile() {
  const file = path.join(process.cwd(), 'mintytask1-firebase-adminsdk-fbsvc-ab1a3738fb.json');
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  } catch {
    return null;
  }
}

export type FirebaseAdminCreds = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

/** Resolves the same credentials used to initialize the Admin SDK (for guards / diagnostics). */
export function resolveChosenFirebaseCredentials(): FirebaseAdminCreds | null {
  const fileCreds = readServiceAccountFromFile();
  const privateKeyFromEnv = parsePrivateKey();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const envCreds: FirebaseAdminCreds | null =
    projectId && clientEmail && privateKeyFromEnv
      ? {
          projectId,
          clientEmail,
          privateKey: privateKeyFromEnv,
        }
      : null;

  const usingEnv = Boolean(envCreds);
  const isHostedProd =
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.NETLIFY === 'true';
  const useFileCreds = Boolean(fileCreds) && !isHostedProd;

  const chosen: FirebaseAdminCreds | null | undefined =
    isHostedProd && usingEnv
      ? envCreds
      : isHostedProd && fileCreds && !usingEnv
        ? fileCreds
        : useFileCreds && fileCreds
          ? fileCreds
          : usingEnv
            ? envCreds
            : fileCreds;

  if (!chosen?.projectId || !chosen.clientEmail || !chosen.privateKey) {
    return null;
  }
  return chosen;
}

let firebaseAdminCertError: string | undefined;

const resolvedFirebaseCreds = resolveChosenFirebaseCredentials();

if (!getApps().length && resolvedFirebaseCreds) {
  const chosen = resolvedFirebaseCreds;
  if (process.env.NODE_ENV !== 'production') {
    const fileCreds = readServiceAccountFromFile();
    const pk = parsePrivateKey();
    const usingEnv = Boolean(
      process.env.FIREBASE_PROJECT_ID?.trim() &&
        process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
        pk
    );
    if (usingEnv && fileCreds) {
      const mismatch =
        process.env.FIREBASE_PROJECT_ID?.trim() !== fileCreds.projectId ||
        process.env.FIREBASE_CLIENT_EMAIL?.trim() !== fileCreds.clientEmail ||
        pk !== fileCreds.privateKey;
      if (mismatch) {
        console.warn('[firebaseAdmin] ENV credentials do not match local JSON credentials');
      }
    }
  }
  try {
    console.info('[firebaseAdmin] Initializing for project:', chosen.projectId);
    initializeApp({
      credential: cert({
        projectId: chosen.projectId,
        clientEmail: chosen.clientEmail,
        privateKey: chosen.privateKey,
      }),
    });
  } catch (e) {
    firebaseAdminCertError = e instanceof Error ? e.message : String(e);
    console.error(
      '[firebaseAdmin] initializeApp failed (usually FIREBASE_PRIVATE_KEY formatting on Vercel):',
      firebaseAdminCertError
    );
  }
} else if (!getApps().length) {
  console.error(
    '[firebaseAdmin] No Firebase Admin credentials. On Vercel, set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (see .env.example).'
  );
}

/** True only after Admin SDK successfully initialized (not just env present). */
export const isFirebaseAdminConfigured = getApps().length > 0;

/** Shown when env vars are absent or empty after normalization. */
export const FIREBASE_ADMIN_MISSING_MESSAGE =
  'Payment backend is not configured. In Vercel → Environment Variables, add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY for Production (and Preview if you use it). Private key: one line, no extra outer quotes, use \\n where the JSON had line breaks.';

/** Shown when env looks set but cert() / PEM failed (wrong key format). */
export const FIREBASE_ADMIN_PEM_FAILED_MESSAGE =
  'Firebase Admin could not start: invalid FIREBASE_PRIVATE_KEY. In Vercel, open the variable: remove wrapping "quotes", paste the full key as one line with the two characters backslash and n (\\n) between PEM lines, then Redeploy. Check Vercel → Logs for "PEM" or "no start line".';

export function getFirebaseAdminBootStatus(): {
  ready: boolean;
  certError?: string;
  envLooksComplete: boolean;
} {
  const pk = normalizeFirebasePrivateKeyFromEnv(process.env.FIREBASE_PRIVATE_KEY);
  const envLooksComplete = Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      pk
  );
  return {
    ready: getApps().length > 0,
    certError: firebaseAdminCertError,
    envLooksComplete,
  };
}

function getDb(): Firestore {
  if (!isFirebaseAdminConfigured || !getApps().length) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your server environment (Vercel → Project → Settings → Environment Variables).'
    );
  }
  return getFirestore();
}

/** Firestore admin; throws if credentials were not configured at startup (e.g. missing env on Vercel). */
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    const db = getDb();
    const value = Reflect.get(db as object, prop, receiver);
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(db);
    }
    return value;
  },
});
