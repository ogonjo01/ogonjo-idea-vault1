// src/components/HorizontalCarousel.jsx
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import './ContentFeed.css';

const SkeletonCard = () => (
  <div className="summary-card skeleton" aria-hidden="true">
    <div className="cover-wrap" />
    <div className="card-content">
      <div className="s-line title" />
      <div className="s-line author" />
      <div className="s-line summary short" />
      <div className="card-footer">
        <div className="s-chip" />
        <div className="s-chip" />
        <div className="s-chip" />
      </div>
    </div>
  </div>
);

const HorizontalCarousel = ({
  title,
  children,
  items = [],
  viewAllLink = '#',
  loading = false,
  emptyMessage = 'No items',
  skeletonCount = 6,
}) => {
  const scrollerRef = useRef(null);

  const handleScrollBy = (delta) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section
      className="hf-carousel"
      aria-roledescription="carousel"
      aria-label={title}
    >
      <header className="hf-carousel-header">
        <h3 className="hf-title">{title}</h3>

        <div className="hf-actions">
          <button
            className="hf-btn"
            type="button"
            aria-label="Scroll left"
            onClick={() => handleScrollBy(-320)}
          >
            ◀
          </button>

          <button
            className="hf-btn"
            type="button"
            aria-label="Scroll right"
            onClick={() => handleScrollBy(320)}
          >
            ▶
          </button>

          <Link
            className="hf-viewall"
            to={viewAllLink}
            aria-label={`View all ${title}`}
          >
            View all
          </Link>
        </div>
      </header>

      <div
        className="hf-scroller"
        ref={scrollerRef}
        role="region"
        tabIndex={0}
        aria-label={`${title} content`}
      >
        {loading ? (
          <ul className="hf-items" role="list" aria-hidden="true">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <li key={i} className="hf-item">
                <SkeletonCard />
              </li>
            ))}
          </ul>
        ) : items.length > 0 ? (
          <ul className="hf-items" role="list">
            {children}
          </ul>
        ) : (
          <p className="hf-empty" aria-live="polite">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
};

export default HorizontalCarousel;
