import React from 'react';
import { CreditCard, Share2, IndianRupee, CheckCircle } from 'lucide-react';


const STEPS = [
  { id: 'step-1', icon: CreditCard, label: 'Sign up & pay', desc: 'Create your account, then pay the exact joining QR amount (₹29.xx) — dashboard + reel bundle unlock together.' },
  { id: 'step-2', icon: Share2, label: 'Share Bundle Link', desc: 'Share your unique reel bundle referral links with your audience.' },
  { id: 'step-3', icon: IndianRupee, label: 'Earn ₹50 / Sale', desc: 'Each successful referred reel bundle sale gives you a flat ₹50 reward.' },
  { id: 'step-4', icon: CheckCircle, label: 'Withdraw to UPI', desc: 'Request withdrawal from ₹50. A fixed ₹2 service fee is applied.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-white/50 text-lg">4 simple steps to start earning</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line desktop */}
          <div className="hidden lg:block absolute top-10 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)' }} />

          {STEPS?.map((step, idx) => {
            const Icon = step?.icon;
            return (
              <div key={step?.id} className="glass-card-hover p-7 text-center relative animate-fade-in-up">
                <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4 relative z-10">
                  <Icon size={22} className="text-white" />
                </div>
                <span className="absolute top-4 right-4 text-xs font-bold text-white/20 font-mono">0{idx + 1}</span>
                <h3 className="text-sm font-bold text-white mb-2">{step?.label}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{step?.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}