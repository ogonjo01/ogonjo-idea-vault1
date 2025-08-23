import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Next-level responsive Book Summary Carousel
 * - Tailwind-first styling (no external CSS required)
 * - Scroll-snap based horizontal carousel with accessible controls
 * - Multi-line clamp with ellipsis for descriptions (adapts to screen size)
 * - Touch / swipe support for mobile
 * - Autoplay with pause-on-hover / focus
 * - Responsive cards-per-view (1 / 2 / 3) for small/medium/large screens
 *
 * Requirements: TailwindCSS in your project. If you don't use Tailwind, I can
 * provide a plain CSS alternative on request.
 */

interface BookSummary {
  id: string;
  title: string;
  author: string;
  summary_content?: any;
  short_description: string;
  likes?: number;
  views?: number;
  category?: string;
  created_at?: string;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

interface BookSummaryCarouselProps {
  summaries: BookSummary[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const SWIPE_THRESHOLD = 40; // px

const BookSummaryCarousel: React.FC<BookSummaryCarouselProps> = ({
  summaries = [],
  autoPlay = true,
  autoPlayInterval = 4000,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [cardsPerView, setCardsPerView] = useState(1);
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
    if (!autoPlay || isPaused || summaries.length <= cardsPerView) return;
    timerRef.current = window.setInterval(() => {
      scrollToIndex((index + 1) % summaries.length);
    }, autoPlayInterval) as unknown as number;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isPaused, index, cardsPerView, summaries.length, autoPlayInterval]);

  useEffect(() => {
    // Keep index valid if summaries length changes
    if (index >= summaries.length) setIndex(0);
  }, [summaries.length, index]);

  const getCardWidth = () => {
    const container = containerRef.current;
    if (!container) return 0;
    return container.clientWidth / cardsPerView;
  };

  const scrollToIndex = (i: number, smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    const cardW = getCardWidth();
    const left = Math.round(cardW * i);
    container.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    setIndex(i);
  };

  const next = () => scrollToIndex((index + 1) % summaries.length);
  const prev = () => scrollToIndex((index - 1 + summaries.length) % summaries.length);

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

  if (!summaries || summaries.length === 0) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-sm border border-gray-100 text-center">
        <p className="text-sm text-gray-500">No summaries available.</p>
      </div>
    );
  }

  // clamp lines for description
  let clampLines = 3;
  if (cardsPerView === 1) clampLines = 3;
  else if (cardsPerView === 2) clampLines = 4;
  else clampLines = 5;

  const clampStyle: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: clampLines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  return (
    <div className="relative w-full">
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 touch-pan-x"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="Book summaries carousel"
      >
        {summaries.map((s, i) => (
          <article
            key={s.id}
            className="snap-start shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm p-4 w-[85%] sm:w-[48%] lg:w-[31%]"
            style={{ scrollSnapAlign: 'start' }}
            onClick={() => (window.location.href = `/book-summary/${s.id}`)}
          >
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate" title={s.title}>
                {s.title}
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate" title={s.author}>
                {s.author}
              </p>

              <p className="mt-3 text-sm text-gray-700 dark:text-gray-200" style={clampStyle} title={s.short_description}>
                {s.short_description}
              </p>

              <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                <Link
                  to={`/book-summary/${s.id}`}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:brightness-95 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Details
                </Link>

                <div className="flex items-center gap-2">
                  {s.affiliate_links && s.affiliate_links.length > 0 ? (
                    <a
                      href={s.affiliate_links[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="sc-btn sc-buy bg-green-500 hover:bg-green-600"
                    >
                      Get Book
                    </a>
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/book-summary/${s.id}`;
                      if (navigator.share) navigator.share({ title: s.title, url }).catch(() => {});
                      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('Link copied'));
                      else window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-xs px-2 py-1 border rounded-md bg-white/60 dark:bg-gray-800/60"
                    aria-label={`Share ${s.title}`}
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Controls */}
      {summaries.length > 1 && (
        <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none sm:pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="pointer-events-auto ml-2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center"
            aria-label="Previous summaries"
          >
            ‹
          </button>
        </div>
      )}

      {summaries.length > 1 && (
        <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none sm:pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="pointer-events-auto mr-2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center"
            aria-label="Next summaries"
          >
            ›
          </button>
        </div>
      )}

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {summaries.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-transform transform ${i === index ? 'scale-125 bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            aria-label={`Go to summary ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BookSummaryCarousel;
