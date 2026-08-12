import React from 'react';

interface AppLoadingScreenProps {
  message?: string;
}

/**
 * Branded loading screen shown by MainApp() (App.tsx) while `isAuthLoading`
 * is true — the one loading gate in the app, unchanged by this component.
 * Deliberately restrained: one logo, one static background treatment, one
 * subtle entrance animation. No competing motion systems — the previous
 * version's orbiting badges, spinning lamp gradient, rotating grid, and
 * dual logo treatment are gone; see docs/HANDOFF for the removal rationale
 * if this needs revisiting.
 */
export default function AppLoadingScreen({ message = 'A carregar o sistema...' }: AppLoadingScreenProps) {
  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden relative bg-[#0d0806]">
      <style>{`
        .als-bg-image {
          position: absolute;
          inset: 0;
          background-image: url('/loading/sabush-tech-concept.webp');
          background-size: cover;
          background-position: center 38%;
          opacity: 0.28;
          filter: saturate(0.9) brightness(0.75);
        }
        .als-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 45%, rgba(13,8,6,0.35) 0%, rgba(13,8,6,0.55) 45%, #0d0806 88%);
        }

        .als-logo-in {
          opacity: 0;
          transform: scale(0.94);
          animation: als-logo-entrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes als-logo-entrance {
          to { opacity: 1; transform: scale(1); }
        }

        .als-bar-fill {
          position: absolute;
          top: 0; bottom: 0;
          width: 40%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, #D69B25, #f5e9c8, #D69B25, transparent);
          animation: als-sweep 1.6s ease-in-out infinite;
        }
        @keyframes als-sweep {
          0% { left: -45%; }
          100% { left: 105%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .als-logo-in { animation: none; opacity: 1; transform: none; }
          .als-bar-fill { animation: none; left: 0; width: 100%; opacity: 0.5; }
        }
      `}</style>

      <div className="als-bg-image" />
      <div className="als-vignette" />

      <div className="flex flex-col items-center gap-6 relative z-10 px-6">
        <img
          src="/branding/sabush-tech-full-logo.png"
          alt="Sabush Tech"
          className="als-logo-in mx-auto"
          style={{ width: 'clamp(180px, 42vmin, 280px)', height: 'auto' }}
        />

        <div className="relative w-[160px] h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div className="als-bar-fill" />
        </div>

        <p className="text-xs font-semibold text-gray-400">{message}</p>
      </div>
    </div>
  );
}
