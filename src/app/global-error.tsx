'use client';

import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleHardReset = () => {
    // Standard industry practice for unrecoverable PWA client crashes:
    // 1. Clear all local storage and session storage
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
    
    // 2. Unregister all service workers
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
        });
    }

    // 3. Force reload from server
    if (typeof window !== 'undefined') {
        window.location.reload();
    }
  };

  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-[600px] bg-black border-8 border-white p-8 md:p-12 shadow-[16px_16px_0_0_#FF0000] text-center rotate-[-1deg] relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/80 border-2 border-black rotate-[3deg]" />
          
          <div className="text-6xl mb-6">⚠️</div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tighter mb-6 drop-shadow-[4px_4px_0_#00FFFF]">
            FATAL ERROR
          </h1>
          
          <div className="bg-white text-black border-4 border-black p-4 inline-block mb-8 rotate-[2deg] shadow-[4px_4px_0_0_#FFFF00]">
            <h2 className="text-xl md:text-2xl font-bold uppercase">
              The App Has Crashed
            </h2>
          </div>

          <p className="text-white font-bold text-lg mb-12 uppercase leading-relaxed max-w-2xl mx-auto">
            Something went horribly wrong. Your local data might be corrupted.
          </p>

          <button 
            onClick={handleHardReset}
            className="bg-[#FF00FF] text-white border-8 border-white shadow-[8px_8px_0_0_#FFFF00] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#FFFF00] active:translate-x-2 active:translate-y-2 active:shadow-none py-4 px-12 text-2xl font-extrabold uppercase transition-all rotate-[2deg] hover:rotate-0"
          >
            Hard Reset & Fix
          </button>
        </div>
      </body>
    </html>
  );
}
