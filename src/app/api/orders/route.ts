import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const salesSnap = await adminDb
      .collection('reelSales')
      .where('buyerId', '==', userId)
      .get();

    const orders = salesSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        bundleId: d.bundleId ?? '',
        price: Number(d.price ?? 99),
        createdAt: d.createdAt ?? null,
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('orders route error', error);
    return NextResponse.json({ orders: [] });
  }
}

