import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom'; // Added import
import './Courses.css';

interface Course {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  instructor: string;
  duration: string;
  price: string;
  imageUrl: string;
  views: number;
  likes: number;
  enrollment_count: number;
  created_at: string;
}

interface CourseCarouselProps {
  courses: Course[];
}

const CourseCarousel: React.FC<CourseCarouselProps> = ({ courses }) => {
  const [windowItems, setWindowItems] = useState<Course[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (courses.length < 3) return;
    setWindowItems(courses.slice(0, 4));
  }, [courses]);

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
        const lastIdx = courses.findIndex(c => c.id === lastId);
        const next = courses[(lastIdx + 1) % courses.length];
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
      const firstIdx = courses.findIndex(c => c.id === firstId);
      const prevCourse = courses[(firstIdx - 1 + courses.length) % courses.length];
      return [prevCourse, ...prev.slice(0, 3)];
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
        {windowItems.map((course) => (
          <div
            key={course.id}
            className="carousel-panel"
            onClick={() => window.location.href = `/course/${course.id}`}
          >
            <div className="carousel-content">
              <h2 className="text-xl font-semibold">{course.title}</h2>
              <p className="text-sm">{course.shortDescription || course.longDescription || 'No description available'}</p>
              <Link
                to={`/course/${course.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                onClick={(e) => e.stopPropagation()}
              >
                Enroll
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

export default CourseCarousel;