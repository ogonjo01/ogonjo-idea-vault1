// src/components/HorizontalCarousel/HorizontalCarousel.jsx
import React, { useRef, useCallback } from 'react';
import './HorizontalCarousel.css';

const CardSkeleton = () => (
  <div className="card-skeleton" aria-hidden="true">
    <div className="s-cover" />
    <div className="s-lines">
      <div className="s-line short" />
      <div className="s-line" />
      <div className="s-line narrow" />
    </div>
  </div>
);

/**
 * HorizontalCarousel
 * 
 * Props:
 *  - title: string
 *  - children: React nodes (rendered items)
 *  - items: array (data backing the items)
 *  - sortKey: string (newest, likes, rating, views)
 *  - category: string | null
 *  - tag: string | null
 *  - viewAllLink: string | null (fallback manual link)
 *  - loading: bool
 *  - skeletonCount: number
 *  - emptyMessage: string
 */
const HorizontalCarousel = ({
  title,
  children,
  items = [],
  sortKey = 'newest',
  category = null,
  tag = null,
  viewAllLink = null,
  loading = false,
  skeletonCount = 6,
  emptyMessage = 'No items',
}) => {
  const scrollerRef = useRef(null);

  const handleScrollBy = useCallback((delta) => {
    const s = scrollerRef.current;
    if (!s) return;
    s.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  // Build explore link EXACTLY like ContentFeed does
  const buildViewAllLink = useCallback((sortKey = 'newest', category = null, tag = null, fields = 'id,title,description,author,created_at,tags') => {
    const params = new URLSearchParams();
    if (sortKey) params.set('sort', sortKey);
    if (category) params.set('category', category);
    if (tag) {
      params.set('tag', tag);
      params.set('tag_only', '1');
    }
    if (fields) params.set('fields', fields);
    const s = params.toString();
    return s ? `/explore?${s}` : '/explore';
  }, []);

  // Build text EXACTLY like ContentFeed does
  const buildSeeMoreText = useCallback(({ sortKey = 'newest', category = null, tag = null } = {}) => {
    const sortMap = {
      newest: 'Newest Content',
      likes: 'Most Liked content',
      rating: 'Most Rated Content',
      views: 'Most Viewed Content',
    };
    const base = sortMap[sortKey] || 'more content';
    if (tag) return `Explore More From ${base} In "${tag}"`;
    if (category) return `Explore More From ${base} In ${category}`;
    return `Explore More From ${base}`;
  }, []);

  // Render CTA EXACTLY like ContentFeed does
  const SeeMoreCTA = ({ href, text }) => {
    if (!href) return null;
    return (
      <div className="hf-viewall-wrapper" aria-hidden={false} style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <a href={href} className="hf-viewall" role="button">{text}</a>
      </div>
    );
  };

  const hasItems = Array.isArray(items) && items.length > 0;

  // Generate href and text for "See More" button
  const seeMoreHref = viewAllLink || buildViewAllLink(sortKey, category, tag);
  const seeMoreText = buildSeeMoreText({ sortKey, category, tag });

  return (
    <section className="hf-carousel" aria-roledescription="carousel" aria-label={title}>
      {/* Header */}
      <div className="hf-carousel-header">
        <h3 className="hf-title">{title}</h3>
        <div className="hf-actions" role="toolbar" aria-label={`${title} controls`}>
          <button
            type="button"
            className="hf-btn"
            onClick={() => handleScrollBy(-320)}
            aria-label={`Scroll ${title} left`}
            title="Scroll left"
          >
            ◀
          </button>
          <button
            type="button"
            className="hf-btn"
            onClick={() => handleScrollBy(320)}
            aria-label={`Scroll ${title} right`}
            title="Scroll right"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Scroller */}
      <div className="hf-scroller-wrapper">
        <div
          className="hf-scroller"
          ref={scrollerRef}
          tabIndex={0}
          role="list"
          aria-label={`${title} items`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              handleScrollBy(320);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              handleScrollBy(-320);
            }
          }}
        >
          {loading ? (
            <div className="hf-items" role="group" aria-busy="true" aria-label={`${title} loading skeletons`}>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : hasItems ? (
            <div className="hf-items">{children}</div>
          ) : (
            <div className="hf-empty" role="status" aria-live="polite">{emptyMessage}</div>
          )}
        </div>

        {/* Bottom "Explore more" CTA - ALWAYS shown when items exist */}
        {hasItems && (
          <SeeMoreCTA href={seeMoreHref} text={seeMoreText} />
        )}
      </div>
    </section>
  );
};

export default HorizontalCarousel;