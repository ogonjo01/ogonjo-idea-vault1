import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface InvestmentStrategy {
  id: string;
  title: string;
  category?: string;
  description: string;
  affiliate_link?: string | null;
  views?: number;
  likes?: number;
  isLiked?: boolean;
  created_at?: string;
}

interface StrategyCarouselProps {
  strategies: InvestmentStrategy[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const SWIPE_THRESHOLD = 40;

const StrategyCarousel: React.FC<StrategyCarouselProps> = ({
  strategies = [],
  autoPlay = true,
  autoPlayInterval = 4000,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cardsPerView, setCardsPerView] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

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

  const normalizeIndex = (i: number) => {
    if (!strategies || strategies.length === 0) return 0;
    const n = strategies.length;
    return ((i % n) + n) % n;
  };

  const getCardWidth = () => {
    const container = containerRef.current;
    if (!container) return 0;
    return container.clientWidth / Math.max(1, cardsPerView);
  };

  const scrollToIndex = (rawIndex: number, smooth = true) => {
    const container = containerRef.current;
    if (!container || strategies.length === 0) return;
    const i = normalizeIndex(rawIndex);
    const cardW = getCardWidth() || 1;
    const left = Math.round(cardW * i);
    container.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    setIndex(i);
  };

  const next = () => scrollToIndex(index + 1);
  const prev = () => scrollToIndex(index - 1);

  useEffect(() => {
    if (!autoPlay || isPaused || strategies.length <= cardsPerView) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      scrollToIndex(index + 1);
    }, autoPlayInterval) as unknown as number;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [autoPlay, isPaused, index, cardsPerView, strategies.length, autoPlayInterval]);

  useEffect(() => {
    if (!strategies.length) setIndex(0);
    else if (index >= strategies.length) setIndex(0);
  }, [strategies.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setIsPaused(true);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const dx = touchStartX.current - touchEndX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const cardW = getCardWidth() || 1;
        const newIndex = Math.round(el.scrollLeft / cardW);
        if (newIndex !== index) setIndex(normalizeIndex(newIndex));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cardsPerView, strategies.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Home') scrollToIndex(0);
    else if (e.key === 'End') scrollToIndex(strategies.length - 1);
  };

  if (!strategies.length) return <div className="sc-empty">No strategies available.</div>;

  const clampStyle: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 3, // exactly 3 lines
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const openAffiliate = (url?: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="sc-root">
      <div
        className="sc-scroll"
        ref={containerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Investment strategies carousel"
      >
        {strategies.map((s) => (
          <article
            key={s.id}
            className="sc-card"
            onClick={() =>
              s.affiliate_link ? openAffiliate(s.affiliate_link) : navigate(`/strategy-detail/${s.id}`)
            }
            title={s.title}
          >
            <div className="sc-body">
              <h3 className="sc-title">{s.title}</h3>
              <p className="sc-category">{s.category}</p>
              <p className="sc-desc" style={clampStyle}>
                {s.description}
              </p>

              <div className="sc-footer">
                <button
                  className="sc-btn sc-view"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/strategy-detail/${s.id}`);
                  }}
                >
                  View
                </button>

                <button
  className="sc-btn sc-buy bg-green-500 hover:bg-green-600"
  onClick={(e) => {
    e.stopPropagation();
    openAffiliate(s.affiliate_link);
  }}
>
  Get Book
</button>


                <span className="sc-stats">
                  {s.views ?? 0} 👁️ • {s.likes ?? 0} ❤️
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {strategies.length > 1 && (
        <>
          <button className="sc-control sc-prev" onClick={(e) => { e.stopPropagation(); prev(); }}>‹</button>
          <button className="sc-control sc-next" onClick={(e) => { e.stopPropagation(); next(); }}>›</button>

          <div className="sc-dots" role="tablist" aria-label="Strategy pages">
            {strategies.map((_, i) => (
              <button
                key={i}
                className={`sc-dot ${i === index ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); scrollToIndex(i); }}
                aria-selected={i === index}
                role="tab"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StrategyCarousel;
