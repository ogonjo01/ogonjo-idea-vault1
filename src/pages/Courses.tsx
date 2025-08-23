import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import AdBanner from '../components/AdBanner';
import { Course } from '../types/CourseTypes';
import CourseCarousel from './CourseCarousel'; // Verify this path
import './Courses.css';

const confetti = () => {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
  script.async = true;
  document.body.appendChild(script);
  script.onload = () => {
    // @ts-ignore
    if ((window as any).confetti) (window as any).confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };
};

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoriesData, setCategoriesData] = useState<string[]>(['All']);
  const [error, setError] = useState<string | null>(null);
  const [topCourses, setTopCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<{ id: string; courseId: string; text: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (courseError) throw courseError;
      const courses = (courseData || []) as Course[];
      setAllCourses(courses);
      setTopCourses(courses.slice(0, 4));

      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .limit(10);
      if (reviewError) throw reviewError;
      setReviews(reviewData || []);
    } catch (err: any) {
      setError(`Error fetching data: ${err?.message || String(err)}`);
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const channel = supabase
      .channel('public:courses_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'courses' }, (payload) => {
        setAllCourses(prev => [payload.new as Course, ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'courses' }, (payload) => {
        setAllCourses(prev => prev.map(course => course.id === (payload.new as Course).id ? payload.new as Course : course));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'courses' }, (payload) => {
        setAllCourses(prev => prev.filter(course => course.id !== (payload.old as Course).id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const uniqueCategories = ['All', ...Array.from(new Set(allCourses.map(course => course.category || 'Uncategorized')))];
    setCategoriesData(uniqueCategories);

    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const categoryFiltered = allCourses.filter((course) => {
      const matchesCategory = selectedCategory === 'All' || (course.category || 'Uncategorized') === selectedCategory;
      const matchesSearch =
        (!lowercasedSearchTerm) ||
        (course.title && course.title.toLowerCase().includes(lowercasedSearchTerm)) ||
        (course.shortDescription && course.shortDescription.toLowerCase().includes(lowercasedSearchTerm)) ||
        (course.longDescription && course.longDescription.toLowerCase().includes(lowercasedSearchTerm)) ||
        (course.instructor && course.instructor.toLowerCase().includes(lowercasedSearchTerm));
      return matchesCategory && matchesSearch;
    });
    setFilteredCourses(categoryFiltered);
  }, [searchTerm, selectedCategory, allCourses]);

  useEffect(() => {
    if (!topCourses || topCourses.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % topCourses.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [topCourses.length]);

  const getMostViewedCourses = useCallback(() => [...allCourses].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6), [allCourses]);
  const getMostLikedCourses = useCallback(() => [...allCourses].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 6), [allCourses]);
  const getLatestCourses = useCallback(() => {
    return [...allCourses].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    }).slice(0, 6);
  }, [allCourses]);

  const handleCoursePress = useCallback((courseId: string) => navigate(`/course/${courseId}`), [navigate]);
  const handleLoginPress = useCallback(() => navigate('/login'), [navigate]);
 
  // NEW: navigate to course detail (same target as View).
const handleEnroll = useCallback((courseId: string) => {
  if (user) {
    confetti();
    // navigate to course detail and pass state so detail page knows user clicked Enroll
    navigate(`/course/${courseId}`, { state: { enrolledViaButton: true } });
  } else {
    // not logged in => go to login
    handleLoginPress();
  }
}, [user, navigate, handleLoginPress]);


  const renderCourseCard = useCallback((course: Course) => {
    const review = reviews.find(r => r.courseId === course.id);
    return (
      <article
        key={course.id}
        className="course-card"
        aria-labelledby={`course-${course.id}-title`}
        role="group"
      >
        <div className="course-image-container">
          {course.imageUrl ? (
            String(course.imageUrl).endsWith('.mp4') ? (
              <video src={course.imageUrl} className="course-image" muted loop playsInline />
            ) : (
              <img src={course.imageUrl} className="course-image" alt={course.title || 'Course image'} />
            )
          ) : (
            <div className="course-text-preview" aria-hidden>
              <div className="course-thumb-gradient" />
            </div>
          )}
        </div>

        <div className="card-content">
          {/* Title: clickable control only (not the whole card) */}
          <h3 id={`course-${course.id}-title`} className="course-title" title={course.title}>
            <button
              className="title-link"
              onClick={(e) => { e.stopPropagation(); handleCoursePress(course.id); }}
              aria-label={`Open course ${course.title}`}
            >
              {course.title || 'Untitled Course'}
            </button>
          </h3>

          <div className="meta-row">
            <span className="course-category">{course.category || 'Uncategorized'}</span>
            <span className="course-duration">{course.duration || '—'}</span>
          </div>

          <p className="course-description" title={course.shortDescription || course.longDescription}>
            {course.shortDescription || course.longDescription || 'No description available.'}
          </p>

          <div className="card-bottom">
            <div className="stats-grid" aria-hidden>
              <div className="stat-item"><span className="stat-label">Views</span><span className="stat-value">{course.views || 0}</span></div>
              <div className="stat-item"><span className="stat-label">Likes</span><span className="stat-value">{course.likes || 0}</span></div>
              <div className="stat-item"><span className="stat-label">Enrolled</span><span className="stat-value">{course.enrollment_count || 0}</span></div>
            </div>

            <div className="card-actions" role="group" aria-label="Course actions">
              <button
                className="enroll-button"
                onClick={(e) => { e.stopPropagation(); handleEnroll(course.id); }}
                aria-label={`Enroll in ${course.title}`}
                title="Enroll"
              >
                Enroll
              </button>

              <button
                className="view-details-btn-secondary"
                onClick={(e) => { e.stopPropagation(); handleCoursePress(course.id); }}
                aria-label={`View details for ${course.title}`}
                title="View details"
              >
                View
              </button>
            </div>
          </div>
        </div>

        {review && (
          <div className="review-popup" aria-hidden>
            <p className="review-text">{review.text}</p>
          </div>
        )}
      </article>
    );
  }, [handleCoursePress, handleEnroll, reviews]);

  if (isLoading && allCourses.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button className="retry-button" onClick={fetchCourses}>Retry</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="warning-container">
        <h2 className="warning-title">Please Log In</h2>
        <p className="warning-message">You need to be logged in to view courses. Please log in to access the content.</p>
        <button className="login-button" onClick={handleLoginPress}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="courses-container">
  <div className="content-wrapper" style={{ zIndex: 10, position: "relative" }}>
    {/* Header now above carousel */}
    <header className="header">
      <h1 className="header-title">Courses</h1>
      <button
        className="info-button"
        onClick={() => alert("Info: Explore a variety of courses to enhance your skills!")}
        aria-label="Courses information"
      >
        <span className="info-button-text">Info</span>
      </button>
    </header>

    {/* Carousel placed under header + search */}
    <div className="carousel-wrapper" style={{ zIndex: 5, marginTop: 12 }}>
      <CourseCarousel courses={topCourses} />
    </div>
    
    {/* Search sits directly under header */}
    <div className="search-container" role="search" aria-label="Search courses">
      <input
        type="text"
        className="search-input"
        placeholder="Search courses..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Search courses"
      />
      {searchTerm.length > 0 && (
        <button className="clear-search-button" onClick={() => setSearchTerm("")} aria-label="Clear search">
          ✕
        </button>
      )}
    </div>

    

        <AdBanner adUnitId="courses_top_banner" advertiserName="Online Learning Platforms" callToAction="Start Learning Now" />

        <section className="section">
          <h2 className="section-header">Most Viewed Courses</h2>
          <div className="courses-grid">
            {getMostViewedCourses().length === 0 ? (<p className="no-courses-text">No most viewed courses available.</p>) : getMostViewedCourses().map(renderCourseCard)}
          </div>
        </section>

        <section className="section">
          <h2 className="section-header">Most Liked Courses</h2>
          <div className="courses-grid">
            {getMostLikedCourses().length === 0 ? (<p className="no-courses-text">No most liked courses available.</p>) : getMostLikedCourses().map(renderCourseCard)}
          </div>
        </section>

        <AdBanner adUnitId="courses_mid_banner" advertiserName="Business Skill Workshops" callToAction="Join a Workshop" />

        <section className="section">
          <h2 className="section-header">Latest Courses</h2>
          <div className="courses-grid">
            {getLatestCourses().length === 0 ? (<p className="no-courses-text">No latest courses available.</p>) : getLatestCourses().map(renderCourseCard)}
          </div>
        </section>

        <section className="section">
          <h2 className="section-header">Courses by Category</h2>
          <div className="category-scroll-view" style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 6 }}>
            {categoriesData.map((category) => (
              <button
                key={category}
                className={`category-chip ${selectedCategory === category ? 'selected-category-chip' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                <span className={`category-chip-text ${selectedCategory === category ? 'selected-category-chip-text' : ''}`}>
                  {category}
                </span>
              </button>
            ))}
          </div>

          <div className="courses-grid">
            {filteredCourses.length === 0 ? (
              <div className="empty-state-container">
                <h2 className="empty-state-text">No courses found for this category.</h2>
              </div>
            ) : filteredCourses.map(renderCourseCard)}
          </div>
        </section>

        <AdBanner adUnitId="courses_bottom_banner" advertiserName="Career Advancement Programs" callToAction="Enroll Today" />
      </div>
    </div>
  );
};

export default Courses;
