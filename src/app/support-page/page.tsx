'use client';

import { FormEvent, useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebaseClient';
import { getClientUserId } from '@/lib/user';

type SupportMessage = {
  id: string;
  sender: 'user' | 'support';
  message: string;
};

export default function SupportPage() {
  const [userId, setUserId] = useState('');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  useEffect(() => {
    const id = getClientUserId();
    setUserId(id);
    const q = query(
      collection(db, `supportThreads/${id}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((doc) => ({
          id: doc.id,
          sender: doc.data().sender,
          message: doc.data().message,
        })) as SupportMessage[]
      );
    });
    return () => unsub();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !userId) return;

    await fetch('/api/support/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: text.trim() }),
    });
    setText('');
  };

  return (
    <AppLayout>
      <div className="glass-card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">Support Chat</h1>
        <p className="text-sm text-white/50">Messages and replies appear here in real-time.</p>
        <div className="space-y-2 max-h-[380px] overflow-auto rounded-xl p-3 bg-black/10">
          {messages.map((msg) => (
            <div key={msg.id} className={`p-2 rounded-lg text-sm ${msg.sender === 'support' ? 'bg-indigo-500/20 text-indigo-100' : 'bg-white/10 text-white'}`}>
              <b>{msg.sender === 'support' ? 'Support' : 'You'}:</b> {msg.message}
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-field flex-1"
            placeholder="Describe your issue..."
          />
          <button type="submit" className="btn-primary">Send</button>
        </form>
      </div>
    </AppLayout>
  );
}
