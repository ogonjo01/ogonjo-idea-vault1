import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './BookSummaries.css';

interface BookSummary {
  id: string;
  title: string;
  author: string;
  summary_content: any;
  short_description: string;
  likes: number;
  views: number;
  category: string;
  created_at: string;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

interface BookSummaryCarouselProps {
  summaries: BookSummary[];
}

const BookSummaryCarousel: React.FC<BookSummaryCarouselProps> = ({ summaries }) => {
  const [windowItems, setWindowItems] = useState<BookSummary[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (summaries.length < 3) return;
    setWindowItems(summaries.slice(0, 4));
  }, [summaries]);

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
        const lastIdx = summaries.findIndex(s => s.id === lastId);
        const next = summaries[(lastIdx + 1) % summaries.length];
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
      const firstIdx = summaries.findIndex(s => s.id === firstId);
      const prevSummary = summaries[(firstIdx - 1 + summaries.length) % summaries.length];
      return [prevSummary, ...prev.slice(0, 3)];
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
        {windowItems.map((summary) => (
          <div
            key={summary.id}
            className="carousel-panel"
            onClick={() => window.location.href = `/book-summary/${summary.id}`}
          >
            <div className="carousel-content">
              <h2 className="text-xl font-semibold">{summary.title}</h2>
              <p className="text-sm">{summary.author}</p>
              <p className="text-sm">{summary.short_description}</p>
              <Link
                to={`/book-summary/${summary.id}`}
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

export default BookSummaryCarousel;