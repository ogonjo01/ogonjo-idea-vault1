
// ogonjo-web-app/src/pages/BookCarousel.tsx
import React, { useEffect, useRef, useState } from 'react';
import './AudibleBooks.css';

interface AudibleBook {
  id: string;
  title: string;
  author: string;
  image_url: string | null;
  audible_affiliate_link: string;
}

interface BookCarouselProps {
  books: AudibleBook[];
}

const BookCarousel: React.FC<BookCarouselProps> = ({ books }) => {
  const [windowItems, setWindowItems] = useState<AudibleBook[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (books.length < 3) return;
    setWindowItems(books.slice(0, 4));
  }, [books]);

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
        const lastIdx = books.findIndex(b => b.id === lastId);
        const next = books[(lastIdx + 1) % books.length];
        return [...prev.slice(1), next];
      });
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      setTimeout(() => (isAnimating.current = false), 50); // Slight delay to ensure reset
    }, 1000);
  };

  const slidePrev = () => {
    if (!trackRef.current || isAnimating.current) return;
    isAnimating.current = true;

    setWindowItems(prev => {
      const firstId = prev[0].id;
      const firstIdx = books.findIndex(b => b.id === firstId);
      const prevBook = books[(firstIdx - 1 + books.length) % books.length];
      return [prevBook, ...prev.slice(0, 3)];
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
        {windowItems.map(book => (
          <div
            key={book.id}
            className="carousel-panel"
            onClick={() => window.open(book.audible_affiliate_link, '_blank')}
          >
            <div className="carousel-content">
              <h2>{book.title}</h2>
              <p>by {book.author}</p>
              <button
                className="listen-btn"
                onClick={e => {
                  e.stopPropagation();
                  window.open(book.audible_affiliate_link, '_blank');
                }}
              >
                Listen Now
              </button>
              <button
                className="share-btn"
                onClick={e => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(book.audible_affiliate_link)
                    .then(() => alert('Link copied!'))
                    .catch(() => window.open(book.audible_affiliate_link, '_blank'));
                }}
              >
                Share
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="carousel-control prev" onClick={slidePrev}>‹</button>
      <button className="carousel-control next" onClick={slideNext}>›</button>
    </div>
  );
};

export default BookCarousel;
