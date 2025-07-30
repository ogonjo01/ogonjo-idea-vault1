import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom'; // Added import
import './Ideas.css';

interface Idea {
  id: string;
  title: string;
  category: string;
  short_description: string;
  views: number;
  likes: number;
  created_at: string;
}

interface IdeaCarouselProps {
  ideas: Idea[];
}

const IdeaCarousel: React.FC<IdeaCarouselProps> = ({ ideas }) => {
  const [windowItems, setWindowItems] = useState<Idea[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (ideas.length < 3) return;
    setWindowItems(ideas.slice(0, 4));
  }, [ideas]);

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
        const lastIdx = ideas.findIndex(i => i.id === lastId);
        const next = ideas[(lastIdx + 1) % ideas.length];
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
      const firstIdx = ideas.findIndex(i => i.id === firstId);
      const prevIdea = ideas[(firstIdx - 1 + ideas.length) % ideas.length];
      return [prevIdea, ...prev.slice(0, 3)];
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
        {windowItems.map((idea) => (
          <div
            key={idea.id}
            className="carousel-panel"
            onClick={() => window.location.href = `/idea-content/${idea.id}`}
          >
            <div className="carousel-content">
              <h2 className="text-xl font-semibold">{idea.title}</h2>
              <p className="text-sm">{idea.short_description}</p>
              <Link
                to={`/idea-content/${idea.id}`}
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

export default IdeaCarousel;