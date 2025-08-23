import React, { useRef, useEffect, useState } from "react";
import { Quote } from "lucide-react";

interface QuoteItem {
  id: string;
  quote_text: string;
  author: string;
  likes: number;
  views: number;
  isLiked?: boolean;
  affiliate_link?: string;
}

interface QuoteCarouselProps {
  quotes: QuoteItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onViewQuote: (quote: QuoteItem) => void; // Callback to parent modal
}

const SWIPE_THRESHOLD = 50;

const QuoteCarousel: React.FC<QuoteCarouselProps> = ({
  quotes = [],
  autoPlay = true,
  autoPlayInterval = 4000,
  onViewQuote,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [cardsPerView, setCardsPerView] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const updateCards = () => {
      const w = window.innerWidth;
      if (w < 640) setCardsPerView(1);
      else if (w < 1024) setCardsPerView(2);
      else setCardsPerView(3);
    };
    updateCards();
    window.addEventListener("resize", updateCards);
    return () => window.removeEventListener("resize", updateCards);
  }, []);

  useEffect(() => {
    if (!autoPlay || isPaused || quotes.length <= cardsPerView) return;
    const interval = setInterval(() => {
      handleNext();
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [currentIndex, isPaused, autoPlay, autoPlayInterval, cardsPerView, quotes.length]);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.scrollWidth / quotes.length;
    track.scrollTo({ left: cardWidth * i, behavior: "smooth" });
    setCurrentIndex(i);
  };

  const handleNext = () => scrollToIndex((currentIndex + 1) % quotes.length);
  const handlePrev = () =>
    scrollToIndex((currentIndex - 1 + quotes.length) % quotes.length);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    let closest = 0;
    let min = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      const diff = Math.abs(rect.left - window.innerWidth / 2);
      if (diff < min) {
        min = diff;
        closest = i;
      }
    });
    setCurrentIndex(closest);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setIsPaused(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const dx = touchStartX.current - touchEndX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
    setIsPaused(false);
  };

  const handleOpenAffiliate = (url: string) => {
    window.open(url, "_blank");
  };

  if (!quotes || quotes.length === 0) {
    return (
      <div className="w-full flex items-center justify-center p-6 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-500">No quotes available.</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory touch-pan-x no-scrollbar"
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {quotes.map((q) => (
          <div
            key={q.id}
            className="snap-center flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 p-3"
          >
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg p-6 flex flex-col h-60 justify-between">
              <Quote className="w-8 h-8 text-white/80" strokeWidth={2.5} />
              <p className="text-lg leading-snug line-clamp-3">{q.quote_text}</p>
              <span className="text-sm font-semibold mt-2">— {q.author}</span>

              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 px-3 py-1.5 text-xs rounded-full bg-white/20 hover:bg-white/30 text-center transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewQuote(q); // 🔹 opens modal in parent
                  }}
                >
                  View
                </button>

                {q.affiliate_link && (
                  <button
                    onClick={() => handleOpenAffiliate(q.affiliate_link!)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-full bg-green-500 hover:bg-green-600 text-center transition"
                  >
                    Get Book
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      {quotes.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 border border-gray-200 shadow flex items-center justify-center"
            aria-label="Previous quote"
          >
            ‹
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 border border-gray-200 shadow flex items-center justify-center"
            aria-label="Next quote"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
};

export default QuoteCarousel;
