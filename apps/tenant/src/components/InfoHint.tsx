import React, { useEffect, useRef, useState } from 'react';

interface InfoHintProps {
  /** The explanatory text/content, hidden until the hint is opened. */
  children: React.ReactNode;
  /** Extra classes on the outer wrapper (for inline positioning next to a label). */
  className?: string;
  /** Popover width in px. Defaults to a compact reading width. */
  width?: number;
  /** Anchor the popover to the right edge instead of the left — use near
   * the right side of a container so the popover doesn't overflow it. */
  align?: 'left' | 'right';
}

/**
 * A small "?" affordance that reveals its explanatory content on demand
 * instead of always rendering it inline. Replaces the previously
 * always-visible `<Info icon> + <p>` banner pattern used throughout the
 * app's forms — same information, just collapsed by default so it no
 * longer permanently occupies layout space.
 *
 * Click/tap toggles (not hover-only, since this needs to work on touch
 * devices where most of this app's staff-facing screens are used) and
 * closes on an outside click or Escape.
 */
export const InfoHint: React.FC<InfoHintProps> = ({ children, className = '', width = 260, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span className={`relative inline-flex align-middle ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        aria-label="Mais informação"
        aria-expanded={open}
        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold leading-none shrink-0 transition ${
          open
            ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#8A6D1F]'
            : 'bg-[var(--muted)] border-[#E5E7EB] text-gray-500 hover:text-[#0B1F3A] hover:border-[#D4AF37]'
        }`}
      >
        ?
      </button>
      {open && (
        <div
          className={`absolute z-30 top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-[12px] leading-snug text-gray-600`}
          style={{ width, maxWidth: '80vw' }}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </span>
  );
};
