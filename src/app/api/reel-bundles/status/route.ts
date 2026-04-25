import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }
    const snap = await adminDb.collection('entryPayPending').doc(token).get();
    if (!snap.exists) {
      return NextResponse.json({ status: 'missing' });
    }
    return NextResponse.json({ status: snap.data()?.status ?? 'pending' });
  } catch (error) {
    console.error('reel status error', error);
    return NextResponse.json({ status: 'pending' });
  }
}

