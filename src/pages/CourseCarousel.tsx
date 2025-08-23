import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Courses.css'; // keep your filename

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
  // windowItems still used as your rotating buffer
  const [windowItems, setWindowItems] = useState<Course[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isAnimating = useRef(false);

  // responsive visible count (1 / 2 / 3)
  const getVisibleCountFromWidth = (w: number) => (w < 640 ? 1 : w < 1024 ? 2 : 3);
  const [visibleCount, setVisibleCount] = useState<number>(getVisibleCountFromWidth(window.innerWidth));

  useEffect(() => {
    const onResize = () => {
      const v = getVisibleCountFromWidth(window.innerWidth);
      setVisibleCount(v);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ensure initial window items match (we keep at least visibleCount + 1 panels so sliding looks good)
  useEffect(() => {
    const needed = Math.max(visibleCount + 1, 4); // keep the 4-minimum you had, but adapt to visibleCount
    if (!courses || courses.length === 0) {
      setWindowItems([]);
      return;
    }
    setWindowItems(courses.slice(0, Math.min(needed, courses.length)));
  }, [courses, visibleCount]);

  // autoplay (keeps your interval behaviour)
  useEffect(() => {
    if (!windowItems || windowItems.length <= visibleCount) return;
    const id = setInterval(() => slideNext(), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowItems, visibleCount]);

  // compute panel width percent and translate percent for one-step move
  const panelWidthPercent = 100 / visibleCount;
  const translateOne = panelWidthPercent; // when we translate we move by exactly this percent

  const slideNext = () => {
    if (!trackRef.current || isAnimating.current) return;
    if (windowItems.length <= visibleCount) return; // nothing to slide

    isAnimating.current = true;
    const track = trackRef.current;
    track.style.transition = 'transform 0.9s ease';
    track.style.transform = `translateX(-${translateOne}%)`;

    setTimeout(() => {
      setWindowItems(prev => {
        // find the last item in prev, get its index in full courses list, append next
        const last = prev[prev.length - 1];
        const lastIdx = courses.findIndex(c => c.id === last.id);
        const next = courses[(lastIdx + 1) % courses.length];
        // remove first, append next
        return [...prev.slice(1), next];
      });

      // reset (snap back)
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';

      setTimeout(() => {
        isAnimating.current = false;
      }, 60);
    }, 900);
  };

  const slidePrev = () => {
    if (!trackRef.current || isAnimating.current) return;
    if (windowItems.length <= visibleCount) return;

    isAnimating.current = true;

    // prepend previous item
    setWindowItems(prev => {
      const first = prev[0];
      const firstIdx = courses.findIndex(c => c.id === first.id);
      const prevCourse = courses[(firstIdx - 1 + courses.length) % courses.length];
      // add prevCourse at front and drop last to keep buffer size same
      return [prevCourse, ...prev.slice(0, prev.length - 1)];
    });

    const track = trackRef.current;
    // start visually shifted left by one panel then animate to 0
    track.style.transition = 'none';
    track.style.transform = `translateX(-${translateOne}%)`;

    setTimeout(() => {
      track.style.transition = 'transform 0.9s ease';
      track.style.transform = 'translateX(0)';
      setTimeout(() => {
        isAnimating.current = false;
      }, 900);
    }, 30);
  };

  // Show nothing if no items
  if (!windowItems || windowItems.length === 0) return null;

  return (
    <div className="carousel-container improved-carousel">
      <div className="carousel-track" ref={trackRef}>
        {windowItems.map((course) => (
          <div
            key={course.id}
            className="carousel-panel"
            // inline sizing so CSS & JS match for any visibleCount
            style={{ flex: `0 0 ${panelWidthPercent}%`, maxWidth: `${panelWidthPercent}%` }}
            onClick={() => window.location.href = `/course/${course.id}`}
          >
            <div className="carousel-card">
              {/* left image (optional) */}
              <div className="carousel-thumb" aria-hidden>
                {course.imageUrl ? <img src={course.imageUrl} alt={course.title} /> : <div className="thumb-placeholder" />}
              </div>

              <div className="carousel-content-inner">
                <h3 className="carousel-title" title={course.title}>{course.title}</h3>

                <p className="carousel-desc" title={course.shortDescription || course.longDescription}>
                  {course.shortDescription || course.longDescription || 'No description available'}
                </p>

                <div className="carousel-footer">
                  <Link
                    to={`/course/${course.id}`}
                    className="carousel-cta"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Enroll
                  </Link>

                  <div className="carousel-meta">
                 {/*}   <span className="meta-instructor">{course.instructor}</span>*/}
                    <span className="meta-price">{course.price}$</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* controls */}
      <button className="carousel-control prev" onClick={slidePrev} aria-label="Previous">‹</button>
      <button className="carousel-control next" onClick={slideNext} aria-label="Next">›</button>
    </div>
  );
};

export default CourseCarousel;
