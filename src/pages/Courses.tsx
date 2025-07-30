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
    if (window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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
        .limit(10);
      if (courseError) throw courseError;
      const courses = courseData || [];
      setAllCourses(courses);
      setTopCourses(courses.slice(0, 4) || []); // Ensure at least 4 items

      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .limit(5);
      if (reviewError) throw reviewError;
      setReviews(reviewData || []);
    } catch (err: any) {
      setError(`Error fetching data: ${err.message}`);
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
    const uniqueCategories = ['All', ...new Set(allCourses.map(course => course.category || 'Uncategorized'))];
    setCategoriesData(uniqueCategories);

    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const categoryFiltered = allCourses.filter((course) => {
      const matchesCategory = selectedCategory === 'All' || (course.category || 'Uncategorized') === selectedCategory;
      const matchesSearch =
        (course.title && course.title.toLowerCase().includes(lowercasedSearchTerm)) ||
        (course.shortDescription && course.shortDescription.toLowerCase().includes(lowercasedSearchTerm)) ||
        (course.longDescription && course.longDescription.toLowerCase().includes(lowercasedSearchTerm)) ||
        (course.instructor && course.instructor.toLowerCase().includes(lowercasedSearchTerm));
      return matchesCategory && matchesSearch;
    });
    setFilteredCourses(categoryFiltered);
  }, [searchTerm, selectedCategory, allCourses]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % topCourses.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [topCourses.length]);

  const getMostViewedCourses = useCallback(() => [...allCourses].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5), [allCourses]);
  const getMostLikedCourses = useCallback(() => [...allCourses].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5), [allCourses]);
  const getLatestCourses = useCallback(() => {
    return [...allCourses].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    }).slice(0, 5);
  }, [allCourses]);

  const handleCoursePress = useCallback((courseId: string) => navigate(`/course/${courseId}`), [navigate]);
  const handleLoginPress = useCallback(() => navigate('/login'), [navigate]);
  const handleEnroll = useCallback((courseId: string) => {
    if (user) {
      confetti();
      console.log(`Enrolled in course ${courseId}`);
    } else {
      handleLoginPress();
    }
  }, [user, navigate]);

  const renderCourseCard = useCallback(({ item }: { item: Course }) => {
    const review = reviews.find(r => r.courseId === item.id);
    return (
      <div className="course-card" onClick={() => handleCoursePress(item.id)} style={{ cursor: 'pointer' }}>
        <div className="course-image-container">
          {item.imageUrl ? (
            <video src={item.imageUrl.replace('jpg', 'mp4') || 'https://via.placeholder.com/300'} className="course-image" muted loop playsInline />
          ) : (
            <div className="course-text-preview" style={{ background: `linear-gradient(135deg, #4a90e2, #9013fe)` }}>
              <h3>{item.title || 'Untitled Course'}</h3>
            </div>
          )}
        </div>
        <div className="card-content">
          <h3 className="course-title">{item.title || 'Untitled Course'}</h3>
          <span className="course-category">{item.category || 'Uncategorized'}</span>
          <p className="course-description">{item.shortDescription || item.longDescription || 'No description available'}</p>
          <div className="course-info-row">
            <span className="course-info-text">{item.duration || 'N/A'}</span>
            <span className="course-price">{item.price || 'Free'}</span>
          </div>
          <div className="stats-grid">
            <div className="stat-item"><span className="stat-label">Views</span><span className="stat-value">{item.views || 0}</span></div>
            <div className="stat-item"><span className="stat-label">Likes</span><span className="stat-value">{item.likes || 0}</span></div>
            <div className="stat-item"><span className="stat-label">Enrolled</span><span className="stat-value">{item.enrollment_count || 0}</span></div>
          </div>
          <button className="enroll-button" onClick={(e) => { e.stopPropagation(); handleEnroll(item.id); }}>Enroll</button>
        </div>
        {review && (
          <div className="review-popup">
            <p className="review-text">{review.text}</p>
          </div>
        )}
      </div>
    );
  }, [handleCoursePress, handleEnroll, reviews]);

  if (isLoading && allCourses.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
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

  console.log('Top Courses:', topCourses); // Debug log
  return (
    <div className="courses-container">
      <div className="carousel-wrapper" style={{ zIndex: 5 }}>
        <CourseCarousel courses={topCourses} />
      </div>
      <div className="content-wrapper" style={{ zIndex: 10, position: 'relative' }}>
        <header className="header">
          <h1 className="header-title">Courses</h1>
          <button className="info-button" onClick={() => alert('Info: Explore a variety of courses to enhance your skills!')}>
            <span className="info-button-text">Info</span>
          </button>
        </header>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm.length > 0 && (
            <button className="clear-search-button" onClick={() => setSearchTerm('')}>
              ✕
            </button>
          )}
        </div>
        <AdBanner adUnitId="courses_top_banner" advertiserName="Online Learning Platforms" callToAction="Start Learning Now" />
        {searchTerm.length > 0 || selectedCategory !== 'All' ? (
          filteredCourses.length === 0 ? (
            <div className="empty-state-container">
              <h2 className="empty-state-text">No courses found for your search or filter.</h2>
              <p className="empty-state-sub-text">Try adjusting your search or selecting a different category.</p>
            </div>
          ) : (
            <section className="section">
              <h2 className="section-header">Search & Filter Results</h2>
              <div className="courses-grid">
                {filteredCourses.map((course) => renderCourseCard({ item: course }))}
              </div>
            </section>
          )
        ) : (
          <>
            <section className="section">
              <h2 className="section-header">Most Viewed Courses</h2>
              <div className="courses-grid">
                {getMostViewedCourses().length === 0 ? (
                  <p className="no-courses-text">No most viewed courses available.</p>
                ) : getMostViewedCourses().map((course) => renderCourseCard({ item: course }))}
              </div>
            </section>
            <section className="section">
              <h2 className="section-header">Most Liked Courses</h2>
              <div className="courses-grid">
                {getMostLikedCourses().length === 0 ? (
                  <p className="no-courses-text">No most liked courses available.</p>
                ) : getMostLikedCourses().map((course) => renderCourseCard({ item: course }))}
              </div>
            </section>
            <AdBanner adUnitId="courses_mid_banner" advertiserName="Business Skill Workshops" callToAction="Join a Workshop" />
            <section className="section">
              <h2 className="section-header">Latest Courses</h2>
              <div className="courses-grid">
                {getLatestCourses().length === 0 ? (
                  <p className="no-courses-text">No latest courses available.</p>
                ) : getLatestCourses().map((course) => renderCourseCard({ item: course }))}
              </div>
            </section>
            <section className="section">
              <h2 className="section-header">Courses by Category</h2>
              <div className="category-scroll-view">
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
                ) : filteredCourses.map((course) => renderCourseCard({ item: course }))}
              </div>
            </section>
            <AdBanner adUnitId="courses_bottom_banner" advertiserName="Career Advancement Programs" callToAction="Enroll Today" />
          </>
        )}
      </div>
    </div>
  );
};

export default Courses;