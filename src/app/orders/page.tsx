'use client';

import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ALL_REEL_BUNDLE_PACK, REEL_TELEGRAM_COMMUNITY_URL } from '@/lib/constants';
import { getClientUserId } from '@/lib/user';
import { hasBundleCommunityUnlocked } from '@/lib/bundleAccess';

type Order = {
  id: string;
  bundleId: string;
  price: number;
};

export default function OrdersPage() {
  const userId = useMemo(() => (typeof window !== 'undefined' ? getClientUserId() : ''), []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showCommunity, setShowCommunity] = useState(false);

  useEffect(() => {
    const sync = () => setShowCommunity(hasBundleCommunityUnlocked());
    sync();
    window.addEventListener('focus', sync);
    window.addEventListener('mintytask-bundle-unlocked', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('mintytask-bundle-unlocked', sync);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const res = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}`);
      const data = await res.json().catch(() => ({ orders: [] }));
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    };
    load();
  }, [userId]);

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-sm text-white/50 mt-0.5">Your purchased bundles and access links.</p>
        </div>

        {showCommunity ? (
          <a href={REEL_TELEGRAM_COMMUNITY_URL} target="_blank" rel="noreferrer" className="btn-ghost inline-flex">
            Join private community
          </a>
        ) : (
          <p className="text-sm text-white/45 max-w-xl">
            The private Telegram group unlocks after your reel bundle payment is confirmed on the home page, or from a
            buyer using your reel link. Invite links are under Invite &amp; earn.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => {
            const isAllPack = order.bundleId === ALL_REEL_BUNDLE_PACK.id;
            const emoji = isAllPack ? ALL_REEL_BUNDLE_PACK.emoji : '🎬';
            const name = isAllPack ? ALL_REEL_BUNDLE_PACK.name : order.bundleId;
            return (
              <div key={order.id} className="glass-card p-5">
                <p className="text-3xl mb-2">{emoji}</p>
                <h3 className="text-white font-semibold">{name}</h3>
                <p className="text-sm text-white/50 mt-1">Purchased • ₹{order.price.toFixed(2)}</p>
              </div>
            );
          })}
          {orders.length === 0 && (
            <div className="glass-card p-6 text-white/60">No bundles purchased yet.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

