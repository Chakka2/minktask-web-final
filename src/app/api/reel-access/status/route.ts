import { NextRequest, NextResponse } from 'next/server';
import {
  adminDb,
  FIREBASE_ADMIN_MISSING_MESSAGE,
  FIREBASE_ADMIN_PEM_FAILED_MESSAGE,
  getFirebaseAdminBootStatus,
  isFirebaseAdminConfigured,
} from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required', accessGranted: false }, { status: 400 });
  }

  try {
    if (!isFirebaseAdminConfigured) {
      const boot = getFirebaseAdminBootStatus();
      if (boot.envLooksComplete && boot.certError) {
        return NextResponse.json(
          { error: FIREBASE_ADMIN_PEM_FAILED_MESSAGE, code: 'FIREBASE_ADMIN_CERT_FAILED', accessGranted: false },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: FIREBASE_ADMIN_MISSING_MESSAGE, code: 'FIREBASE_ADMIN_MISSING', accessGranted: false },
        { status: 503 }
      );
    }

    const snap = await adminDb.collection('reelAccessPayments').doc(userId).get();
    const ok = snap.exists && String(snap.data()?.status ?? '') === 'confirmed';

    return NextResponse.json({ accessGranted: ok, payment: snap.data() ?? null });
  } catch (e) {
    const code = (e as { code?: string | number })?.code;
    if (code === 16 || code === '16') {
      console.error('reel-access status auth error', e);
      return NextResponse.json(
        { error: FIREBASE_ADMIN_PEM_FAILED_MESSAGE, code: 'FIREBASE_ADMIN_AUTH_FAILED', accessGranted: false },
        { status: 503 }
      );
    }
    console.error('reel-access status error', e);
    return NextResponse.json({ error: 'Status unavailable', accessGranted: false }, { status: 503 });
  }
}
