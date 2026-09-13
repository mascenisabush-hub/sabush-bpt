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
 * The logo mark is now an opaque, white-background asset rather than the
 * old transparent artwork, so it's framed as a white rounded card — same
 * treatment as AuthView's login-page logo — instead of the old alpha-
 * masked blue glow + shine-on-the-mark-itself. The shine sweep is now
 * clipped to the card's own rounded rect (a soft light pass across the
 * card) rather than masked to the logo's alpha channel, since there is
 * no longer one to mask against.
 */
export default function AppLoadingScreen({ message = 'A preparar o sistema...' }: AppLoadingScreenProps) {
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

        .als-logo-card {
          position: relative;
          width: clamp(180px, 42vmin, 280px);
          background: #fff;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
          overflow: hidden;
          opacity: 0;
          transform: scale(0.9) translateY(10px);
          animation: als-logo-entrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .als-logo-card img {
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

        /* Shine sweep clipped to the card's own rounded rect (overflow:
           hidden on .als-logo-card above) — a soft light pass across the
           white card, rather than the old alpha-channel mask built for
           transparent artwork. */
        .als-shine {
          position: absolute;
          inset: 0;
          left: -55%;
          width: 50%;
          z-index: 2;
          background: linear-gradient(
            105deg,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0.02) 35%,
            rgba(0,0,0,0.07) 50%,
            rgba(0,0,0,0.02) 65%,
            rgba(0,0,0,0) 100%
          );
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
          .als-logo-card { animation: none; opacity: 1; transform: none; }
          .als-shine { animation: none; opacity: 0; }
          .als-bar-fill { animation: none; left: 0; width: 100%; opacity: 0.5; }
        }
      `}</style>

      <div className="als-bg-image" />
      <div className="als-vignette" />

      <div className="flex flex-col items-center gap-6 relative z-10 px-6">
        <div className="als-logo-card mx-auto">
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
