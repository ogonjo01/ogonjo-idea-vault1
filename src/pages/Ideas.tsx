import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Link } from 'react-router-dom';
import IdeaCarousel from './IdeaCarousel'; // New import
import './Ideas.css';

const Ideas = () => {
  const [latestIdeas, setLatestIdeas] = useState<any[]>([]);
  const [mostLikedIdeas, setMostLikedIdeas] = useState<any[]>([]);
  const [mostViewedIdeas, setMostViewedIdeas] = useState<any[]>([]);
  const [mostPopularIdeas, setMostPopularIdeas] = useState<any[]>([]);
  const [popularIdeasByCategory, setPopularIdeasByCategory] = useState<{ category: string; ideas: any[] }[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDataForSection = async (
    orderByColumn: 'created_at' | 'likes' | 'views',
    limit: number = 6,
    category?: string
  ): Promise<any[]> => {
    try {
      let query = supabase
        .from('business_ideas')
        .select('id, title, category, short_description, views, likes, created_at');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: supabaseError } = await query
        .order(orderByColumn, { ascending: false })
        .limit(limit);

      if (supabaseError) {
        console.error(`Supabase Error fetching ${orderByColumn} ideas (category: ${category || 'all'}):`, supabaseError.message);
        throw supabaseError;
      }
      return data || [];
    } catch (err: any) {
      console.error(`Error fetching ${orderByColumn} ideas (category: ${category || 'all'}):`, err.message);
      return [];
    }
  };

  const fetchAllIdeasData = async () => {
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
      const categories = ['Technology', 'Finance', 'Health', 'Education', 'Retail'];
      for (const cat of categories) {
        const ideas = await fetchDataForSection('likes', 6, cat);
        if (ideas.length > 0) {
          popularByCat.push({ category: cat, ideas });
        }
      }
      setPopularIdeasByCategory(popularByCat);
    } catch (err: any) {
      setError('Failed to load ideas. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIdeasData();
  }, []);

  const handleCategoryFilterPress = (category: string) => {
    setSelectedCategoryFilter(category);
  };

  const renderSection = (title: string, data: any[], filterType: string, categoryName?: string) => {
    const displayData = (filterType === 'latest' && selectedCategoryFilter !== 'All')
      ? data.filter((idea) => idea.category === selectedCategoryFilter)
      : data;

    if (displayData.length === 0) {
      return (
        <div className="section-container">
          <div className="section-header-row">
            <h2 className="section-header">{title}</h2>
            <Link to={`/idea-list?title=All ${title}&filterType=${filterType}${categoryName ? `&categoryName=${categoryName}` : ''}`} className="see-all-button">
              See All
              <span role="img" aria-label="arrow" className="arrow-icon">➡️</span>
            </Link>
          </div>
          <div className="empty-state-container">
            <p className="empty-state-text">No ideas found for this section.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="section-container">
        <div className="section-header-row">
          <h2 className="section-header">{title}</h2>
          <Link to={`/idea-list?title=All ${title}&filterType=${filterType}${categoryName ? `&categoryName=${categoryName}` : ''}`} className="see-all-button">
            See All
            <span role="img" aria-label="arrow" className="arrow-icon">➡️</span>
          </Link>
        </div>
        <div className="ideas-grid">
          {displayData.map((idea) => (
            <Link
              key={idea.id}
              to={`/idea-content/${idea.id}`}
              state={{ idea }}
              className="idea-card-link"
            >
              <div className="idea-card">
                <h3 className="idea-title">{idea.title}</h3>
                <p className="idea-category">{idea.category}</p>
                <p className="idea-description">{idea.short_description}</p>
                <div className="idea-stats">
                  <span>Views: {idea.views}</span>
                  <span>Likes: {idea.likes}</span>
                </div>
                <p className="view-details">View Details</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderExploreCard = (icon: string, text: string, path: string) => (
    <Link to={path} className="explore-more-card">
      <span role="img" aria-label="icon" className="explore-icon">{icon}</span>
      <p className="explore-more-text">{text}</p>
      <span role="img" aria-label="arrow" className="arrow-icon">➡️</span>
    </Link>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
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

  return (
    <div className="ideas-page">
      <div className="carousel-wrapper" style={{ zIndex: 5 }}>
        <IdeaCarousel ideas={latestIdeas} />
      </div>
      <div className="content-wrapper" style={{ zIndex: 10, position: 'relative' }}>
        <div className="category-filter-container">
          <button
            className={`category-filter-pill ${selectedCategoryFilter === 'All' ? 'category-filter-pill-active' : ''}`}
            onClick={() => handleCategoryFilterPress('All')}
          >
            <span className="category-filter-text">All</span>
          </button>
          {['Technology', 'Finance', 'Health', 'Education', 'Retail'].map((cat) => (
            <button
              key={cat}
              className={`category-filter-pill ${selectedCategoryFilter === cat ? 'category-filter-pill-active' : ''}`}
              onClick={() => handleCategoryFilterPress(cat)}
            >
              <span className="category-filter-text">{cat}</span>
            </button>
          ))}
        </div>
        {renderSection('Latest Ideas', latestIdeas, 'latest')}
        {renderSection('Most Popular Ideas', mostPopularIdeas, 'mostPopular')}
        {renderSection('Most Liked Ideas', mostLikedIdeas, 'mostLiked')}
        {renderSection('Most Viewed Ideas', mostViewedIdeas, 'mostViewed')}
        {popularIdeasByCategory.map((section) =>
          renderSection(`Most Popular in ${section.category}`, section.ideas, 'category', section.category)
        )}
        <h2 className="section-title">Explore More</h2>
        {renderExploreCard('🔍', 'Discover New Categories', '/category-explore')}
        {renderExploreCard('📈', 'Trending Ideas', '/idea-list?title=Trending Ideas&filterType=trending')}
      </div>
    </div>
  );
};

export default Ideas;