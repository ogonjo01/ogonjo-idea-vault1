import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * IdeaCarousel — next-level, responsive, mobile-first
 * - Tailwind utility classes (if you don't use Tailwind I can convert to CSS)
 * - Scroll-snap horizontal carousel with touch/swipe support
 * - Responsive cards-per-view (1 / 2 / 3)
 * - Multi-line clamp with ellipsis for long descriptions
 * - Autoplay with pause-on-hover/focus and accessible controls
 *
 * Usage: <IdeaCarousel ideas={ideas} autoPlay autoPlayInterval={4000} />
 */

interface Idea {
  id: string;
  title: string;
  category?: string;
  short_description: string;
  views?: number;
  likes?: number;
  created_at?: string;
}

interface IdeaCarouselProps {
  ideas: Idea[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const SWIPE_THRESHOLD = 40; // px

const IdeaCarousel: React.FC<IdeaCarouselProps> = ({
  ideas = [],
  autoPlay = true,
  autoPlayInterval = 4000,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cardsPerView, setCardsPerView] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [index, setIndex] = useState(0);

  // touch
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setCardsPerView(1);
      else if (w < 1024) setCardsPerView(2);
      else setCardsPerView(3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!autoPlay || isPaused || ideas.length <= cardsPerView) return;
    timerRef.current = window.setInterval(() => {
      scrollToIndex((index + 1) % ideas.length);
    }, autoPlayInterval) as unknown as number;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isPaused, index, cardsPerView, ideas.length, autoPlayInterval]);

  useEffect(() => {
    if (index >= ideas.length) setIndex(0);
  }, [ideas.length, index]);

  const getCardWidth = () => {
    const container = containerRef.current;
    if (!container) return 0;
    return container.clientWidth / cardsPerView;
  };

  const scrollToIndex = (i: number, smooth = true) => {
    const container = containerRef.current;
    if (!container || ideas.length === 0) return;
    const cardW = getCardWidth();
    const left = Math.round(cardW * i);
    container.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    setIndex(i);
  };

  const next = () => scrollToIndex((index + 1) % ideas.length);
  const prev = () => scrollToIndex((index - 1 + ideas.length) % ideas.length);

  // touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => (touchEndX.current = e.touches[0].clientX);
  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const dx = touchStartX.current - touchEndX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // sync index on manual scroll (find nearest card)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cardW = getCardWidth() || 1;
        const newIndex = Math.round(el.scrollLeft / cardW);
        if (newIndex !== index) setIndex(newIndex);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsPerView, ideas.length]);

  if (!ideas || ideas.length === 0) {
    return (
      <div className="w-full p-6 bg-gray-50 rounded-md text-center">
        <p className="text-sm text-gray-500">No ideas available.</p>
      </div>
    );
  }

  // clamp lines based on cardsPerView
  const clampLines = cardsPerView === 1 ? 3 : cardsPerView === 2 ? 4 : 5;
  const clampStyle: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: clampLines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 touch-pan-x"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="Ideas carousel"
      >
        {ideas.map((idea, i) => (
          <article
            key={idea.id}
            className="snap-start shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm p-4 w-[85%] sm:w-[48%] lg:w-[31%] cursor-pointer"
            style={{ scrollSnapAlign: 'start' }}
            onClick={() => (window.location.href = `/idea-content/${idea.id}`)}
          >
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate" title={idea.title}>
                {idea.title}
              </h3>

              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate" title={idea.category}>
                {idea.category}
              </p>

              <p className="mt-3 text-sm text-gray-700 dark:text-gray-200" style={clampStyle} title={idea.short_description}>
                {idea.short_description}
              </p>

              <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                <Link to={`/idea-content/${idea.id}`} state={{ idea }} className="view-details-btn" aria-label={`View details for ${idea.title || 'idea'}`}
                  
                  onClick={(e) => e.stopPropagation()}
                >
                  View Details
                </Link>

                <div className="text-xs text-gray-500">
                  <span className="mr-3">{idea.views ?? 0} views</span>
                  <span>{idea.likes ?? 0} likes</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Controls */}
      {ideas.length > 1 && (
        <>
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none sm:pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="pointer-events-auto ml-2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center"
              aria-label="Previous ideas"
            >
              ‹
            </button>
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none sm:pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="pointer-events-auto mr-2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center"
              aria-label="Next ideas"
            >
              ›
            </button>
          </div>

          {/* dots */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {ideas.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-transform transform ${i === index ? 'scale-125 bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                aria-label={`Go to idea ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IdeaCarousel;
