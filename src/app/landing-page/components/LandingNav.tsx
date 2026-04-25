'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Menu, X } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

type LandingNavProps = {
  onPickPay?: () => void;
};

export default function LandingNav({ onPickPay }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { firebaseUser, profile, loading } = useFirebaseAuth();
  const paidMember = Boolean(!loading && firebaseUser && profile?.paymentStatus === 'paid');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-white/[0.06]' : ''
      }`}
      style={
        scrolled
          ? { background: 'rgba(8, 12, 22, 0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }
          : { background: 'transparent' }
      }
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-semibold text-base tracking-tight text-white/90">MintyTask</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#choose"
            className="text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
            onClick={() => onPickPay?.()}
          >
            Plans
          </a>
          <a
            href="#payment"
            className="text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
          >
            Pay
          </a>
          {paidMember ? (
            <Link
              href="/dashboard"
              className="text-xs font-semibold uppercase tracking-wider text-[hsl(222_47%_8%)] bg-white/90 hover:bg-white px-4 py-2 rounded-lg transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold uppercase tracking-wider text-[hsl(222_47%_8%)] bg-white/90 hover:bg-white px-4 py-2 rounded-lg transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
        <button
          className="md:hidden p-2 text-white/50 hover:text-white/80"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <div
          className="md:hidden border-t border-white/[0.06] px-4 py-4 flex flex-col gap-1"
          style={{ background: 'rgba(8, 12, 22, 0.95)', backdropFilter: 'blur(12px)' }}
        >
          <a
            href="#choose"
            className="text-sm text-white/55 py-2.5"
            onClick={() => {
              setMenuOpen(false);
              onPickPay?.();
            }}
          >
            Plans
          </a>
          <a href="#payment" className="text-sm text-white/55 py-2.5" onClick={() => setMenuOpen(false)}>
            Pay
          </a>
          {paidMember ? (
            <Link href="/dashboard" className="text-sm font-medium text-white py-2.5" onClick={() => setMenuOpen(false)}>
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium text-white py-2.5" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
