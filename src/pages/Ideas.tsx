
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Link } from 'react-router-dom';
import IdeaCarousel from './IdeaCarousel';
import './Ideas.css';

const CATEGORIES = ['All', 'Technology', 'Finance', 'Health', 'Education', 'Retail'];

const Ideas: React.FC = () => {
  const [latestIdeas, setLatestIdeas] = useState<any[]>([]);
  const [mostLikedIdeas, setMostLikedIdeas] = useState<any[]>([]);
  const [mostViewedIdeas, setMostViewedIdeas] = useState<any[]>([]);
  const [mostPopularIdeas, setMostPopularIdeas] = useState<any[]>([]);
  const [popularIdeasByCategory, setPopularIdeasByCategory] = useState<{ category: string; ideas: any[] }[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchDataForSection = async (
    orderByColumn: 'created_at' | 'likes' | 'views',
    limit = 6,
    category?: string
  ): Promise<any[]> => {
    try {
      let query = supabase
        .from('business_ideas')
        .select('id, title, category, short_description, views, likes, created_at');

      if (category) query = query.eq('category', category);

      const { data, error: supabaseError } = await query.order(orderByColumn, { ascending: false }).limit(limit);

      if (supabaseError) {
        console.error(`Supabase Error fetching ${orderByColumn} ideas (category: ${category || 'all'}):`, supabaseError.message);
        throw supabaseError;
      }
      return data || [];
    } catch (err: any) {
      console.error(`Error fetching ${orderByColumn} ideas (category: ${category || 'all'}):`, err?.message ?? err);
      return [];
    }
  };

  const fetchAllIdeasData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestResult, mostLikedResult, mostViewedResult, mostPopularResult] = await Promise.allSettled([
        fetchDataForSection('created_at', 6),
        fetchDataForSection('likes', 6),
        fetchDataForSection('views', 6),
        fetchDataForSection('likes', 6),
      ]);

      setLatestIdeas(latestResult.status === 'fulfilled' ? latestResult.value : []);
      setMostLikedIdeas(mostLikedResult.status === 'fulfilled' ? mostLikedResult.value : []);
      setMostViewedIdeas(mostViewedResult.status === 'fulfilled' ? mostViewedResult.value : []);
      setMostPopularIdeas(mostPopularResult.status === 'fulfilled' ? mostPopularResult.value : []);

      const popularByCat: { category: string; ideas: any[] }[] = [];
      for (const cat of CATEGORIES.slice(1)) {
        const ideas = await fetchDataForSection('likes', 6, cat);
        if (ideas.length > 0) popularByCat.push({ category: cat, ideas });
      }
      setPopularIdeasByCategory(popularByCat);
    } catch (err) {
      setError('Failed to load ideas. Please check your network and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllIdeasData();
  }, [fetchAllIdeasData]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const handleCategoryFilterPress = useCallback((category: string) => {
    setSelectedCategoryFilter(category);
  }, []);

  const calculatePopularityScore = (views = 0, likes = 0) => Math.min(Math.round((views * 0.4 + likes * 0.6) / 10), 100);
  const calculatePoints = (views = 0, likes = 0) => Math.round(views * 0.5 + likes * 1.5);

  const renderSection = (title: string, data: any[], filterType: string, categoryName?: string) => {
    const displayData = filterType === 'latest' && selectedCategoryFilter !== 'All'
      ? data.filter((idea) => idea.category === selectedCategoryFilter)
      : data;

    if (!displayData || displayData.length === 0) {
      return (
        <div className="section-container" key={title}>
          <div className="section-header-row">
            <h2 className="section-header">{title}</h2>
            <Link to={`/idea-list?title=${encodeURIComponent(`All ${title}`)}&filterType=${encodeURIComponent(filterType)}${categoryName ? `&categoryName=${encodeURIComponent(categoryName)}` : ''}`} className="see-all-button">
              See All <span className="arrow">➡️</span>
            </Link>
          </div>
          <div className="empty-state-container">
            <p className="empty-state-text">No ideas found for this section.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="section-container" key={title}>
        <div className="section-header-row">
          <h2 className="section-header">{title}</h2>
          <Link to={`/idea-list?title=${encodeURIComponent(`All ${title}`)}&filterType=${encodeURIComponent(filterType)}${categoryName ? `&categoryName=${encodeURIComponent(categoryName)}` : ''}`} className="see-all-button">
            See All <span className="arrow">➡️</span>
          </Link>
        </div>

        <div className="ideas-grid">
          {displayData.map((idea: any) => (
            <Link key={idea.id} to={`/idea-content/${idea.id}`} state={{ idea }} className="idea-card-link">
              <article className="idea-card" aria-labelledby={`idea-${idea.id}-title`}>
                <header>
                  <h3 id={`idea-${idea.id}-title`} className="idea-title">{idea.title || 'Untitled'}</h3>
                  <p className="idea-category">{idea.category || 'Uncategorized'}</p>
                </header>

                <div className="idea-body">
                  <p className="idea-description">{idea.short_description || 'No description'}</p>
                </div>

                <footer className="idea-footer">
                  <div className="idea-stats" aria-hidden>
                    <span title={`Views: ${idea.views || 0}`}>👁️ {idea.views || 0}</span>
                    <span title={`Likes: ${idea.likes || 0}`}>❤️ {idea.likes || 0}</span>
                    <span title={`Points: ${calculatePoints(idea.views || 0, idea.likes || 0)}`}>🎯 {calculatePoints(idea.views || 0, idea.likes || 0)}</span>
                  </div>

                  <div className="progress-bar" aria-hidden>
                    <div className="progress-fill" style={{ width: `${calculatePopularityScore(idea.views || 0, idea.likes || 0)}%` }} />
                  </div>

                  <div className="view-row">
                    <Link to={`/idea-content/${idea.id}`} state={{ idea }} className="view-details-btn" aria-label={`View details for ${idea.title || 'idea'}`}>
                      View Details
                    </Link>
                  </div>
                </footer>
              </article>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderExploreCard = (icon: string, text: string, path: string) => (
    <Link to={path} className="explore-more-card" key={path}>
      <span className="explore-icon">{icon}</span>
      <p className="explore-more-text">{text}</p>
      <span className="arrow">➡️</span>
    </Link>
  );

  const scrollToTop = () => containerRef.current?.scrollIntoView({ behavior: 'smooth' });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Loading ideas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button onClick={fetchAllIdeasData} className="retry-button">Retry</button>
      </div>
    );
  }

  // ---------- CATEGORY BAR: use inline styles to guarantee horizontal scrolling ----------
  return (
    <div className={`ideas-page ${isDarkMode ? 'dark' : ''}`} ref={containerRef}>
      <div className="carousel-wrapper">
        <IdeaCarousel ideas={latestIdeas} />
      </div>

      <div className="content-wrapper">
        <div
          className="category-scroll-outer"
          style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 6 }}
        >
          <div
            className="category-filter-container"
            role="tablist"
            aria-label="Idea categories"
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 12,
              padding: '10px 8px',
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
              alignItems: 'center',
              justifyContent: 'flex-start',
              minWidth: 'max-content'
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategoryFilter === cat}
                onClick={() => handleCategoryFilterPress(cat)}
                className={`category-filter-pill ${selectedCategoryFilter === cat ? 'active' : ''}`}
                style={{
                  flex: '0 0 auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  width: 'auto',
                  padding: '8px 14px',
                  borderRadius: 999
                }}
              >
                {cat}
              </button>
            ))}

            <button
              type="button"
              className="dark-mode-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ flex: '0 0 auto', marginLeft: 6 }}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {renderSection('Latest Ideas', latestIdeas, 'latest')}
        {renderSection('Most Popular Ideas', mostPopularIdeas, 'mostPopular')}
        {renderSection('Most Liked Ideas', mostLikedIdeas, 'mostLiked')}
        {renderSection('Most Viewed Ideas', mostViewedIdeas, 'mostViewed')}
        {popularIdeasByCategory.map((section) => renderSection(`Most Popular in ${section.category}`, section.ideas, 'category', section.category))}

        <h2 className="section-title">Explore More</h2>
        <div className="explore-grid">
          {renderExploreCard('🔍', 'Discover New Categories', '/category-explore')}
          {renderExploreCard('📈', 'Trending Ideas', '/idea-list?title=Trending Ideas&filterType=trending')}
        </div>

        <button className="back-to-top" onClick={scrollToTop} aria-label="Back to top">↑</button>
      </div>
    </div>
  );
};

export default Ideas;


