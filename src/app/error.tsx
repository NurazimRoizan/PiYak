'use client';

import { useEffect, useState } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    console.error('[PiYak ErrorBoundary] Captured unhandled error:', error);
  }, [error]);

  const handleResetSession = async () => {
    if (isResetting) return;
    setIsResetting(true);

    try {
      await fetch('/api/auth/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Failed to call reset endpoint', e);
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear storage', e);
      }

      window.location.replace('/api/auth/reset');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 text-center">
      <div className="w-full max-w-[550px] bg-black border-8 border-white p-8 shadow-[12px_12px_0_0_#FF00FF] rotate-[-1deg]">
        <div className="text-5xl mb-4">💩⚠️</div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-white uppercase tracking-tight mb-4 drop-shadow-[3px_3px_0_#00FFFF]">
          Something Went Wonky
        </h1>
        
        <p className="text-white font-bold text-sm md:text-base mb-8 uppercase leading-relaxed max-w-md mx-auto">
          Your session may have expired or data got out of sync. Try refreshing or reset your session below.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-[#00FFFF] text-black border-4 border-white shadow-[4px_4px_0_0_#FFFF00] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#FFFF00] py-3 px-6 text-lg font-black uppercase transition-all"
          >
            Try Again
          </button>
          
          <button
            onClick={handleResetSession}
            disabled={isResetting}
            className="bg-[#FF00FF] text-white border-4 border-white shadow-[4px_4px_0_0_#FFFF00] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#FFFF00] py-3 px-6 text-lg font-black uppercase transition-all disabled:opacity-50"
          >
            {isResetting ? 'Resetting...' : 'Reset Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
