import React from 'react';
import { Info, Clock, Shield, IndianRupee } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const RULES = [
  {
    id: 'rule-min',
    icon: IndianRupee,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    title: 'Minimum ₹50 (first payout)',
    desc: 'Your first withdrawal must be at least ₹50. After one completed payout, you can withdraw your full remaining balance even if it is below ₹50 (above the ₹2 fee).',
  },
  { id: 'rule-fee', icon: Info, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', title: '₹2 Processing Fee', desc: 'A flat ₹2 fee is deducted from each withdrawal request to cover payment gateway costs.' },
  { id: 'rule-time', icon: Clock, color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', title: '24-Hour Processing', desc: 'All withdrawal requests are processed manually within 24 hours on working days.' },
  { id: 'rule-upi', icon: Shield, color: '#4ade80', bg: 'rgba(34,197,94,0.1)', title: 'UPI Only', desc: 'Withdrawals are sent only to verified UPI IDs. Bank transfers are not supported.' },
];

export default function WithdrawRules() {
  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h3 className="text-base font-semibold text-white mb-4">Withdrawal Rules</h3>
        <div className="space-y-4">
          {RULES?.map((rule) => {
            const Icon = rule?.icon;
            return (
              <div key={rule?.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: rule?.bg }}>
                  <Icon size={15} style={{ color: rule?.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">{rule?.title}</p>
                  <p className="text-xs text-white/45 leading-relaxed">{rule?.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Withdrawal Summary</h3>
        <div className="space-y-2">
          {[
            { label: 'Available', value: '₹0.00', color: 'text-white' },
            { label: 'Processing Fee', value: '−₹2.00', color: 'text-red-400' },
            { label: 'Max You Receive', value: '₹0.00', color: 'text-green-400' },
          ]?.map((item) => (
            <div key={`ws-${item?.label}`} className="flex items-center justify-between">
              <span className="text-xs text-white/50">{item?.label}</span>
              <span className={`text-sm font-bold font-mono tabular-nums ${item?.color}`}>{item?.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <p className="text-xs font-semibold text-green-400 mb-1">Need Help?</p>
        <p className="text-xs text-white/50 leading-relaxed">For withdrawal issues, contact support from your dashboard and mention your User ID and request ID.</p>
      </div>
    </div>
  );
}