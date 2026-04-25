import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json();
    if (!userId || !message) {
      return NextResponse.json({ error: 'userId and message required' }, { status: 400 });
    }

    const userSnap = await adminDb.collection('users').doc(String(userId)).get();
    const userEmail = String(userSnap.data()?.email ?? '');
    const msgRef = adminDb.collection('supportThreads').doc(userId).collection('messages').doc();
    await msgRef.set({
      userId,
      sender: 'user',
      message: String(message),
      createdAt: FieldValue.serverTimestamp(),
    });

    await sendTelegramMessage(
      `<b>Support Message</b> [support:${userId}]\nFrom: <code>${userId}</code>\nEmail: <code>${userEmail || '-'}</code>\n\n${String(message)}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('support send error', error);
    return NextResponse.json({ error: 'Failed to send support message' }, { status: 500 });
  }
}
