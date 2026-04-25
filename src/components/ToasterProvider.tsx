'use client';

import { Toaster } from 'sonner';

export default function ToasterProvider() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      toastOptions={{
        classNames: {
          error: 'toast-glass-error',
          title: 'toast-glass-title',
          description: 'toast-glass-description',
        },
      }}
    />
  );
}
