import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdaptiveMenuSliderProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  variant?: 'light' | 'dark';
  ariaLabel?: string;
  compact?: boolean;
}

/**
 * Simple adaptive horizontal slider for long navigation menus, category bars, and tab lists.
 * Automatically adapts to mobile (touch swipe + compact arrows) and desktop (smooth scroll buttons).
 */
export const AdaptiveMenuSlider: React.FC<AdaptiveMenuSliderProps> = ({
  children,
  className = '',
  innerClassName = 'flex items-center gap-1.5',
  variant = 'light',
  ariaLabel = 'Menú deslizable',
  compact = false,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkScroll) : null;
    if (observer) observer.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      if (observer) observer.disconnect();
    };
  }, [checkScroll, children]);

  const handleSlide = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(160, Math.floor(el.clientWidth * 0.65));
    el.scrollBy({
      left: dir === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const isDark = variant === 'dark';

  return (
    <div className={`relative flex items-center w-full min-w-0 group ${className}`} role="region" aria-label={ariaLabel}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleSlide('left')}
          aria-label="Deslizar menú a la izquierda"
          className={`z-10 shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md border transition-all cursor-pointer mr-1 ${
            isDark
              ? 'bg-slate-900/95 hover:bg-slate-800 text-white border-white/20'
              : 'bg-white/95 hover:bg-slate-100 text-slate-800 border-slate-200'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={`flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x ${innerClassName}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleSlide('right')}
          aria-label="Deslizar menú a la derecha"
          className={`z-10 shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md border transition-all cursor-pointer ml-1 ${
            isDark
              ? 'bg-slate-900/95 hover:bg-slate-800 text-white border-white/20'
              : 'bg-white/95 hover:bg-slate-100 text-slate-800 border-slate-200'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
