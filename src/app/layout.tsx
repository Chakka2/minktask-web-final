import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import ToasterProvider from '@/components/ToasterProvider';
import { FirebaseAuthProvider } from '@/contexts/FirebaseAuthContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mintytask.online'),
  title: 'MintyTask — Reel bundle referrals & earnings',
  description:
    'MintyTask: activate your account, share your All Reel Bundle Pack link, and track referral rewards and withdrawals in one dashboard. Secure UPI entry and transparent bundle pricing.',
  keywords: ['MintyTask', 'reel bundle', 'referral earnings', 'UPI', 'India'],
  openGraph: {
    title: 'MintyTask — Reel bundle referrals & earnings',
    description:
      'Share curated reel bundles, grow your network, and manage payouts from a single professional dashboard.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'MintyTask',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MintyTask — Reel bundle referrals & earnings',
    description:
      'Share curated reel bundles, grow your network, and manage payouts from a single professional dashboard.',
  },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[hsl(222_47%_6%)] text-[hsl(210_40%_96%)] font-sans antialiased">
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}