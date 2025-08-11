import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface InvestmentStrategy {
  id: string;
  title: string;
  category: string;
  description: string;
  affiliate_link: string | null;
  views: number;
  likes: number;
  isLiked: boolean;
  created_at: string;
}

interface StrategyCarouselProps {
  strategies: InvestmentStrategy[];
}

const StrategyCarousel: React.FC<StrategyCarouselProps> = ({ strategies }) => {
  const [windowItems, setWindowItems] = useState<InvestmentStrategy[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (strategies.length < 3) return;
    setWindowItems(strategies.slice(0, 4));
  }, [strategies]);

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
        const lastIdx = strategies.findIndex(s => s.id === lastId);
        const next = strategies[(lastIdx + 1) % strategies.length];
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
      const firstIdx = strategies.findIndex(s => s.id === firstId);
      const prevStrategy = strategies[(firstIdx - 1 + strategies.length) % strategies.length];
      return [prevStrategy, ...prev.slice(0, 3)];
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
        {windowItems.map((strategy) => (
          <div
            key={strategy.id}
            className="carousel-panel"
            onClick={() => strategy.affiliate_link && window.open(strategy.affiliate_link, '_blank')}
          >
            <div className="carousel-content">
              <h2 className="text-xl font-semibold">{strategy.title}</h2>
              <p className="text-sm">{strategy.description}</p>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/strategy-detail/${strategy.id}`);
                }}
              >
                View Details
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

export default StrategyCarousel;