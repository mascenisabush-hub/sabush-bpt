import React from 'react';

interface AppLoadingScreenProps {
  message?: string;
}

/**
 * Branded loading screen shown by MainApp() (App.tsx) while `isAuthLoading`
 * is true — the one loading gate in the app, unchanged by this component.
 * Deliberately restrained: one logo, one static background treatment, one
 * motion treatment on the logo itself. No competing motion systems — the
 * previous version's orbiting badges, spinning lamp gradient, rotating
 * grid, and dual logo treatment are gone; see docs/HANDOFF for the removal
 * rationale if this needs revisiting.
 *
 * The logo's motion treatment (scale-in + blue glow pulse + a shine sweep
 * masked to the logo's own alpha channel) replaces the older plain
 * entrance fade — it's still a single treatment on a single element, not
 * an added layer.
 */
export default function AppLoadingScreen({ message = 'A carregar o sistema...' }: AppLoadingScreenProps) {
  const logoUrl = '/branding/sabush-tech-full-logo.png';

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

        .als-logo-wrap {
          position: relative;
          width: clamp(180px, 42vmin, 280px);
          opacity: 0;
          transform: scale(0.9) translateY(10px);
          animation:
            als-logo-entrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards,
            als-logo-glow 1.3s ease-in-out 0.5s infinite alternate;
        }
        .als-logo-wrap img {
          display: block;
          width: 100%;
          height: auto;
          position: relative;
          z-index: 1;
        }
        @keyframes als-logo-entrance {
          0%   { opacity: 0; transform: scale(0.9) translateY(10px); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes als-logo-glow {
          0%   { filter: drop-shadow(0 0 4px rgba(70,150,255,0.2)); }
          100% { filter: drop-shadow(0 0 22px rgba(90,180,255,0.6)) drop-shadow(0 0 40px rgba(60,140,255,0.3)); }
        }

        /* Shine sweep masked to the logo's own alpha channel, so the light
           only travels across the mark itself, not a rectangle around it. */
        .als-shine {
          position: absolute;
          inset: 0;
          left: -55%;
          width: 50%;
          z-index: 2;
          background: linear-gradient(
            75deg,
            rgba(255,255,255,0) 0%,
            rgba(160,210,255,0.05) 35%,
            rgba(210,235,255,0.9) 50%,
            rgba(160,210,255,0.05) 65%,
            rgba(255,255,255,0) 100%
          );
          mix-blend-mode: screen;
          -webkit-mask-image: url('${logoUrl}');
          mask-image: url('${logoUrl}');
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
          opacity: 0;
          animation: als-sweep-logo 1s cubic-bezier(0.3,0.1,0.2,1) 0.5s 2;
        }
        @keyframes als-sweep-logo {
          0%   { left: -55%; opacity: 0; }
          8%   { opacity: 1; }
          45%  { opacity: 1; }
          60%  { opacity: 0; }
          100% { left: 120%; opacity: 0; }
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
          .als-logo-wrap { animation: none; opacity: 1; transform: none; }
          .als-shine { animation: none; opacity: 0; }
          .als-bar-fill { animation: none; left: 0; width: 100%; opacity: 0.5; }
        }
      `}</style>

      <div className="als-bg-image" />
      <div className="als-vignette" />

      <div className="flex flex-col items-center gap-6 relative z-10 px-6">
        <div className="als-logo-wrap mx-auto">
          <img src={logoUrl} alt="Sabush Tech" />
          <div className="als-shine" />
        </div>

        <div className="relative w-[160px] h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div className="als-bar-fill" />
        </div>

        <p className="text-xs font-semibold text-gray-400">{message}</p>
      </div>
    </div>
  );
}
