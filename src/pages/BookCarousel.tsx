import React, { useEffect, useRef, useState } from 'react';
import type { AudibleBook } from '@/types/audible';
import './AudibleBooks.css';

interface BookCarouselProps {
  books: AudibleBook[];
  autoPlay?: boolean;
  autoPlayInterval?: number; // ms
}

const BookCarousel: React.FC<BookCarouselProps> = ({
  books = [],
  autoPlay = true,
  autoPlayInterval = 3000,
}) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right'); // for animation
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!books || books.length === 0) {
      setIndex(0);
    } else {
      setIndex((i) => Math.min(i, Math.max(0, books.length - 1)));
    }
  }, [books]);

  useEffect(() => {
    if (!autoPlay || isPaused || !books || books.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      slideNext();
    }, autoPlayInterval);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isPaused, index, books, autoPlayInterval]);

  const slideNext = () => {
    if (!books || books.length === 0) return;
    setDirection('right');
    setIndex((prev) => (prev + 1) % books.length);
  };

  const slidePrev = () => {
    if (!books || books.length === 0) return;
    setDirection('left');
    setIndex((prev) => (prev - 1 + books.length) % books.length);
  };

  const current = books && books.length > 0 ? books[index] : null;

  if (!current) {
    return <div className="carousel-empty">No books available.</div>;
  }

  const openAffiliate = (url?: string) => {
    if (!url) return;
    try {
      const u = new URL(url);
      window.open(u.toString(), '_blank', 'noopener,noreferrer');
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const shareOrCopy = async (url?: string) => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: current.title, url });
        return;
      } catch {}
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied!');
        return;
      } catch {}
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="carousel-root"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="carousel-viewport">
        <div
          key={current.id}
          className={`carousel-card animate-${direction}`}
          aria-live="polite"
        >
          <div
            className="carousel-image"
            onClick={() => openAffiliate(current.audible_affiliate_link)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') openAffiliate(current.audible_affiliate_link);
            }}
          >
            {current.image_url ? (
              // inline styles force cover and override external global rules
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.image_url}
                alt={current.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div className="carousel-image-placeholder">No cover</div>
            )}
          </div>

          <div className="carousel-meta">
            <h3 className="carousel-title">{current.title}</h3>
            <p className="carousel-author">by {current.author}</p>

            <div className="carousel-buttons">
              <button
                className="btn listen-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openAffiliate(current.audible_affiliate_link);
                }}
              >
                Listen Now
              </button>

              <button
                className="btn share-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  shareOrCopy(current.audible_affiliate_link);
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {books.length > 1 && (
        <>
          <button
            className="carousel-control prev"
            onClick={(e) => {
              e.stopPropagation();
              slidePrev();
            }}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            className="carousel-control next"
            onClick={(e) => {
              e.stopPropagation();
              slideNext();
            }}
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {books.length > 1 && (
        <div className="carousel-dots">
          {books.map((b, i) => (
            <button
              key={b.id}
              className={`dot ${i === index ? 'active' : ''}`}
              onClick={() => {
                setDirection(i > index ? 'right' : 'left');
                setIndex(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookCarousel;
