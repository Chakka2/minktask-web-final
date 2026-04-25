import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId, name, email } = await req.json();
    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
    }

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    await adminDb.collection('users').doc(String(userId)).set(
      {
        userId: String(userId),
        name: cleanName || null,
        email: cleanEmail,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('profile upsert error', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
