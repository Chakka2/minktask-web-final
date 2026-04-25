import React, { Suspense } from 'react';
import LandingExperience from './LandingExperience';

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="landing-premium min-h-screen flex items-center justify-center text-white/35 text-sm font-light">
          Loading…
        </div>
      }
    >
      <LandingExperience />
    </Suspense>
  );
}
