import React from 'react';
import AppLogo from '@/components/ui/AppLogo';

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/8 py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-bold text-lg gradient-text">MintyTask</span>
        </div>
        <p className="text-xs text-white/30 text-center">
          © 2026 MintyTask. All rights reserved. · This platform is for referral and reel bundle earning purposes only.
        </p>
        <div className="flex items-center gap-4">
          <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">Privacy</a>
          <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">Terms</a>
          <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
}