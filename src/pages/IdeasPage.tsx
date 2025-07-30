
// ogonjo-web-app/src/pages/IdeasPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Link, useNavigate } from 'react-router-dom';
import './IdeasPage.css';

interface BusinessIdea {
  id: string;
  title: string;
  category: string;
  description: string;
  likes_count: number;
  comments_count: number;
  views: number;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

const IdeasPage = () => {
  const navigate = useNavigate();
  const [latestIdeas, setLatestIdeas] = useState<BusinessIdea[]>([]);
  const [mostLikedIdeas, setMostLikedIdeas] = useState<BusinessIdea[]>([]);
  const [mostViewedIdeas, setMostViewedIdeas] = useState<BusinessIdea[]>([]);
  const [mostPopularIdeas, setMostPopularIdeas] = useState<BusinessIdea[]>([]);
  const [popularIdeasByCategory, setPopularIdeasByCategory] = useState<{ category: string; ideas: BusinessIdea[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchDataForSection = async (
    orderByColumn: 'created_at' | 'likes' | 'views',
    limit: number = 6,
    category?: string
  ): Promise<BusinessIdea[]> => {
    try {
      let query = supabase
        .from('business_ideas')
        .select(`
          id,
          title,
          category,
          short_description,
          description,
          views,
          youtube_link,
          full_book_link,
          affiliate_links,
          likes,
          idea_comments(count)
        `);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: supabaseError } = await query
        .order(orderByColumn, { ascending: false })
        .limit(limit);

      if (supabaseError) {
        throw supabaseError;
      }
      return data.map((idea: any) => ({
        id: idea.id,
        title: idea.title,
        category: idea.category,
        description: idea.short_description || idea.description || '',
        likes_count: idea.likes || 0,
        comments_count: idea.idea_comments?.[0]?.count || 0,
        views: idea.views || 0,
        youtube_link: idea.youtube_link,
        full_book_link: idea.full_book_link,
        affiliate_links: Array.isArray(idea.affiliate_links) ? idea.affiliate_links : (typeof idea.affiliate_links === 'string' && idea.affiliate_links.length > 0 ? idea.affiliate_links.split(',').map((link: string) => link.trim()) : null),
      }));
    } catch (err: any) {
      console.error(`Error fetching ${orderByColumn} ideas (category: ${category || 'all'}):`, err.message);
      return [];
    }
  };

  const fetchAllHomeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestResult, mostLikedResult, mostViewedResult, mostPopularResult] = await Promise.all([
        fetchDataForSection('created_at', 6),
        fetchDataForSection('likes', 6),
        fetchDataForSection('views', 6),
        fetchDataForSection('likes', 6),
      ]);

      setLatestIdeas(latestResult);
      setMostLikedIdeas(mostLikedResult);
      setMostViewedIdeas(mostViewedResult);
      setMostPopularIdeas(mostPopularResult);

      const popularByCat: { category: string; ideas: BusinessIdea[] }[] = [];
      const categories = ['All', ...new Set(latestIdeas.map(idea => idea.category).filter(Boolean))];
      for (const cat of categories) {
        const ideas = await fetchDataForSection('likes', 6, cat === 'All' ? undefined : cat);
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
    fetchAllHomeData();
    // Simulate unread notification count (replace with real data if available)
    setUnreadNotificationCount(Math.floor(Math.random() * 5));
  }, []);

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryFilter(e.target.value);
  };

  const renderIdeaCard = (item: BusinessIdea) => (
    <div className="idea-card" onClick={() => navigate(`/idea-detail/${item.id}`, { state: { ideaTitle: item.title } })}>
      <div className="idea-card-image-placeholder">
        <span role="img" aria-label="bulb">💡</span>
      </div>
      <h3 className="idea-card-title">{item.title}</h3>
      <p className="idea-card-category">{item.category}</p>
      <div className="idea-card-stats">
        <span><span role="img" aria-label="heart">❤️</span> {item.likes_count}</span>
        <span><span role="img" aria-label="chat">💬</span> {item.comments_count}</span>
        <span><span role="img" aria-label="eye">👁️</span> {item.views}</span>
      </div>
    </div>
  );

  const renderSection = (title: string, data: BusinessIdea[], filterType: 'latest' | 'mostLiked' | 'mostViewed' | 'mostPopular' | 'category', categoryName?: string) => {
    const displayData = (filterType === 'latest' && selectedCategoryFilter !== 'All')
      ? data.filter(idea => idea.category === selectedCategoryFilter)
      : data;

    if (displayData.length === 0) {
      return (
        <div className="section-container">
          <div className="section-header-row">
            <h2 className="section-header">{title}</h2>
            <button className="see-all-button" onClick={() => navigate('/idea-list', { state: { title: `All ${title}`, filterType, categoryName } })}>
              See All <span>›</span>
            </button>
          </div>
          <div className="empty-state-container">
            <p>No ideas found for this section.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="section-container">
        <div className="section-header-row">
          <h2 className="section-header">{title}</h2>
          <button className="see-all-button" onClick={() => navigate('/idea-list', { state: { title: `All ${title}`, filterType, categoryName } })}>
            See All <span>›</span>
          </button>
        </div>
        <div className="grid-list">
          {displayData.map((item) => renderIdeaCard(item))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading ideas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchAllHomeData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="safe-area">
      <div className="sidebar">
        <h3>Menu</h3>
        <ul>
          <li><Link to="/notifications">Notifications {unreadNotificationCount > 0 && <span className="badge">{unreadNotificationCount}</span>}</Link></li>
          <li><Link to="/search">Search</Link></li>
          <li><Link to="/category-explore">Categories</Link></li>
          <li><Link to="/business-insights">Insights</Link></li>
          <li><Link to="/create-idea">Create Idea</Link></li>
        </ul>
      </div>
      <div className="main-content">
        <header className="top-header">
          <h1>Discover</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/notifications')} className="header-button">
              <span role="img" aria-label="bell">🔔</span> {unreadNotificationCount > 0 && <span className="badge">{unreadNotificationCount}</span>}
            </button>
            <button onClick={() => navigate('/search')} className="header-button">
              <span role="img" aria-label="search">🔍</span>
            </button>
          </div>
        </header>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="category-filter-container">
          <label htmlFor="category-filter">Filter by Category: </label>
          <select id="category-filter" value={selectedCategoryFilter} onChange={handleCategoryFilterChange} className="category-filter-dropdown">
            <option value="All">All</option>
            {['Tech', 'Health', 'Finance', 'Education', 'Retail'].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="ai-guide-card">
          <div className="ai-guide-left">
            <span role="img" aria-label="bulb">💡</span>
            <h2>AI Business Strategist</h2>
            <p>Unlock insights for your startup journey!</p>
          </div>
          <button className="ai-guide-button" onClick={() => navigate('/business-insights')}>
            Generate Strategy
          </button>
        </div>
        {renderSection('Latest Ideas', latestIdeas, 'latest')}
        {renderSection('Most Popular Ideas', mostPopularIdeas, 'mostPopular')}
        {renderSection('Most Liked Ideas', mostLikedIdeas, 'mostLiked')}
        {renderSection('Most Viewed Ideas', mostViewedIdeas, 'mostViewed')}
        {popularIdeasByCategory.map((section) =>
          renderSection(`Most Popular in ${section.category}`, section.ideas, 'category', section.category)
        )}
      </div>
    </div>
  );
};

export default IdeasPage;
