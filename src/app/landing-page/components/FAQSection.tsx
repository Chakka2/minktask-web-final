'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { id: 'faq-1', q: 'Is ₹29 a monthly fee?', a: 'No. It is a one-time joining payment. Your dashboard and All Reel Bundle Pack access unlock after payment is confirmed.' },
  { id: 'faq-2', q: 'How much do I earn per referred reel sale?', a: 'You earn a flat ₹50 per successful referred reel bundle sale.' },
  { id: 'faq-3', q: 'What is the minimum withdrawal amount?', a: 'You can withdraw a minimum of ₹50. A ₹2 processing fee applies per withdrawal request. Amount is paid to your UPI ID within 24 hours.' },
  { id: 'faq-4', q: 'How does reel bundle reward work?', a: 'The All Reel Pack is included in the ₹29 joining fee. Separate ₹50 bundle-referral rewards still apply when a referred user completes a qualifying paid bundle flow from your link (amount shown at checkout for UPI matching).' },
  { id: 'faq-5', q: 'Do referrals still earn through entry network?', a: 'Yes. The 4-tier entry network runs separately from bundle sales and pays ₹20, ₹3, ₹2, and ₹1 by level.' },
  { id: 'faq-6', q: 'How do support replies work?', a: 'Support replies appear in your website chat in real-time.' },
];

export default function FAQSection() {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  return (
    <section id="faq" className="py-28 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS?.map((faq) => (
            <div key={faq?.id} className="glass-card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-all"
                onClick={() => setOpenId(openId === faq?.id ? null : faq?.id)}
                aria-expanded={openId === faq?.id}
              >
                <span className="text-sm font-semibold text-white pr-4">{faq?.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-white/40 flex-shrink-0 transition-transform duration-300 ${openId === faq?.id ? 'rotate-180' : ''}`}
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openId === faq?.id ? 'max-h-40' : 'max-h-0'}`}>
                <p className="px-5 pb-5 text-sm text-white/55 leading-relaxed">{faq?.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}