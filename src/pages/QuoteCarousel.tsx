import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Quotes.css';

interface Quote {
  id: string;
  quote_text: string;
  author: string;
  category?: string;
  created_at: string;
  likes: number;
  views: number;
  isLiked?: boolean;
}

interface QuoteCarouselProps {
  quotes: Quote[];
}

const QuoteCarousel: React.FC<QuoteCarouselProps> = ({ quotes }) => {
  const [windowItems, setWindowItems] = useState<Quote[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (quotes.length < 3) return;
    setWindowItems(quotes.slice(0, 4));
  }, [quotes]);

  useEffect(() => {
    if (windowItems.length < 4) return;
    const id = setInterval(() => {
      slideNext();
    }, 3000);
    return () => clearInterval(id);
  }, [windowItems]);

  const slideNext = () => {
    if (!trackRef.current || isAnimating.current) return;
    isAnimating.current = true;

    const track = trackRef.current;
    track.style.transition = 'transform 1s ease-in-out';
    track.style.transform = 'translateX(-33.3333%)';

    setTimeout(() => {
      setWindowItems(prev => {
        const lastId = prev[3].id;
        const lastIdx = quotes.findIndex(q => q.id === lastId);
        const next = quotes[(lastIdx + 1) % quotes.length];
        return [...prev.slice(1), next];
      });
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      setTimeout(() => (isAnimating.current = false), 50);
    }, 1000);
  };

  const slidePrev = () => {
    if (!trackRef.current || isAnimating.current) return;
    isAnimating.current = true;

    setWindowItems(prev => {
      const firstId = prev[0].id;
      const firstIdx = quotes.findIndex(q => q.id === firstId);
      const prevQuote = quotes[(firstIdx - 1 + quotes.length) % quotes.length];
      return [prevQuote, ...prev.slice(0, 3)];
    });

    const track = trackRef.current;
    track.style.transition = 'none';
    track.style.transform = 'translateX(-33.3333%)';

    setTimeout(() => {
      track.style.transition = 'transform 1s ease-in-out';
      track.style.transform = 'translateX(0)';
      setTimeout(() => (isAnimating.current = false), 1000);
    }, 20);
  };

  if (windowItems.length < 4) return null;

  return (
    <div className="carousel-container">
      <div className="carousel-track" ref={trackRef}>
        {windowItems.map((quote) => (
          <div
            key={quote.id}
            className="carousel-panel"
            onClick={() => window.location.href = `/quote-detail/${quote.id}`}
          >
            <div className="carousel-content">
              <p className="text-lg italic">"{quote.quote_text}"</p>
              <p className="text-sm">- {quote.author}</p>
              {quote.category && <p className="text-sm">{quote.category}</p>}
              <Link
                to={`/quote-detail/${quote.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      <button className="carousel-control prev" onClick={slidePrev}>‹</button>
      <button className="carousel-control next" onClick={slideNext}>›</button>
    </div>
  );
};

export default QuoteCarousel;