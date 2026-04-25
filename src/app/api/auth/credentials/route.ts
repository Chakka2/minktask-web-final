import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { hashPassword, verifyPasswordHash } from '@/lib/serverPasswordHash';
import { normalizePassword } from '@/lib/authPassword';

function normalizeEmail(email: string) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

function credDocId(email: string) {
  return email.replace(/\//g, '_');
}

/** Quick check for signup UX — whether this email already has an account. */
export async function GET(req: NextRequest) {
  try {
    const email = normalizeEmail(req.nextUrl.searchParams.get('email') ?? '');
    if (!email) {
      return NextResponse.json({ taken: false });
    }
    const doc = await adminDb.collection('authCredentials').doc(credDocId(email)).get();
    return NextResponse.json({ taken: doc.exists });
  } catch (error) {
    console.error('auth credentials GET error', error);
    return NextResponse.json({ taken: false }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action ?? '');

    if (action === 'register') {
      const email = normalizeEmail(body.email);
      const password = normalizePassword(String(body.password ?? ''));
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      }
      const ref = adminDb.collection('authCredentials').doc(credDocId(email));
      const prev = await ref.get();
      if (prev.exists) {
        return NextResponse.json(
          { error: 'This email is already registered. Log in or use a different email.' },
          { status: 409 }
        );
      }
      await ref.set(
        {
          email,
          passwordHash: hashPassword(password),
          name: name || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'verify') {
      const email = normalizeEmail(body.email);
      const password = normalizePassword(String(body.password ?? ''));
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      }
      const doc = await adminDb.collection('authCredentials').doc(credDocId(email)).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      const hash = String(doc.data()?.passwordHash ?? '');
      if (!verifyPasswordHash(password, hash)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      const name = typeof doc.data()?.name === 'string' ? doc.data()?.name : '';
      return NextResponse.json({ ok: true, email, name: name || '' });
    }

    if (action === 'updatePassword') {
      const email = normalizeEmail(body.email);
      const newPassword = normalizePassword(String(body.newPassword ?? ''));
      if (!email || newPassword.length < 6) {
        return NextResponse.json({ error: 'Valid email and password (6+ chars) required' }, { status: 400 });
      }
      const ref = adminDb.collection('authCredentials').doc(credDocId(email));
      const doc = await ref.get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'No account for this email' }, { status: 404 });
      }
      await ref.set(
        {
          passwordHash: hashPassword(newPassword),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('auth credentials error', error);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
