import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Link } from 'react-router-dom';
import IdeaCarousel from './IdeaCarousel';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [dailyStreak, setDailyStreak] = useState(0); // Gamification: Daily streak
  const [leaderboardTease, setLeaderboardTease] = useState<any[]>([]); // Teaser for top users
  const containerRef = useRef<HTMLDivElement>(null);

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
      const categories = ['Technology', 'Finance', 'Health', 'Education', 'Retail'];
      for (const cat of categories) {
        const ideas = await fetchDataForSection('likes', 6, cat);
        if (ideas.length > 0) {
          popularByCat.push({ category: cat, ideas });
        }
      }
      setPopularIdeasByCategory(popularByCat);

      // Gamification: Fetch leaderboard tease (top 3 users by likes)
      const { data: leaderboardData } = await supabase
        .from('business_ideas')
        .select('user_id, likes')
        .order('likes', { ascending: false })
        .limit(3);
      setLeaderboardTease(leaderboardData || []);
    } catch (err: any) {
      setError('Failed to load ideas. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllIdeasData();
    // Gamification: Update daily streak
    const lastVisit = localStorage.getItem('lastVisit');
    const today = new Date().toDateString();
    if (lastVisit === today) {
      setDailyStreak(parseInt(localStorage.getItem('dailyStreak') || '0'));
    } else {
      const newStreak = (parseInt(localStorage.getItem('dailyStreak') || '0') + 1);
      setDailyStreak(newStreak);
      localStorage.setItem('dailyStreak', newStreak.toString());
      localStorage.setItem('lastVisit', today);
    }
  }, [fetchAllIdeasData]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const handleCategoryFilterPress = useCallback((category: string) => {
    setSelectedCategoryFilter(category);
  }, []);

  const calculatePopularityScore = (views: number, likes: number) => {
    return Math.min(Math.round((views * 0.4 + likes * 0.6) / 10), 100);
  };

  const calculatePoints = (views: number, likes: number) => {
    return Math.round(views * 0.5 + likes * 1.5); // Gamification points
  };

  const renderSection = (title: string, data: any[], filterType: string, categoryName?: string) => {
    const displayData = (filterType === 'latest' && selectedCategoryFilter !== 'All')
      ? data.filter((idea) => idea.category === selectedCategoryFilter)
      : data;

    if (displayData.length === 0) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="section-container">
          <div className="section-header-row">
            <h2 className="section-header">{title}</h2>
            <Link
              to={`/idea-list?title=All ${title}&filterType=${filterType}${categoryName ? `&categoryName=${categoryName}` : ''}`}
              className="see-all-button"
            >
              See All <span className="arrow">➡️</span>
            </Link>
          </div>
          <div className="empty-state-container">
            <p className="empty-state-text">No ideas found for this section.</p>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="section-container">
        <div className="section-header-row">
          <h2 className="section-header">{title}</h2>
          <Link
            to={`/idea-list?title=All ${title}&filterType=${filterType}${categoryName ? `&categoryName=${categoryName}` : ''}`}
            className="see-all-button"
          >
            See All <span className="arrow">➡️</span>
          </Link>
        </div>
        <div className="ideas-grid">
          {displayData.map((idea) => (
            <motion.div
              key={idea.id}
              whileHover={{ scale: 1.05, boxShadow: "var(--hover-glow)" }}
              transition={{ duration: 0.3 }}
            >
              <Link
                to={`/idea-content/${idea.id}`}
                state={{ idea }}
                className="idea-card-link"
              >
                <div className="idea-card">
                  {idea.likes > 50 && <span className="badge">Hot Pick 🔥</span>}
                  {idea.likes > 100 && <span className="badge">Legendary 🏆</span>} {/* Enhanced badge */}
                  <h3 className="idea-title">{idea.title || 'Untitled'}</h3>
                  <p className="idea-category">{idea.category || 'Uncategorized'}</p>
                  <p className="idea-description">{idea.short_description || 'No description'}</p>
                  <div className="idea-stats">
                    <span title="Views" aria-label={`Views: ${idea.views || 0}`}>
                      👁️ {idea.views || 0}
                    </span>
                    <span title="Likes" aria-label={`Likes: ${idea.likes || 0}`}>
                      ❤️ {idea.likes || 0}
                    </span>
                    <span title="Points" aria-label={`Points: ${calculatePoints(idea.views || 0, idea.likes || 0)}`}>
                      🎯 {calculatePoints(idea.views || 0, idea.likes || 0)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${calculatePopularityScore(idea.views || 0, idea.likes || 0)}%` }}
                      transition={{ duration: 0.5 }}
                    ></motion.div>
                  </div>
                  <p className="view-details">View Details <span className="arrow">➡️</span></p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderExploreCard = (icon: string, text: string, path: string) => (
    <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
      <Link to={path} className="explore-more-card">
        <span className="explore-icon">{icon}</span>
        <p className="explore-more-text">{text}</p>
        <span className="arrow">➡️</span>
      </Link>
    </motion.div>
  );

  const scrollToTop = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div className={`ideas-page ${isDarkMode ? 'dark' : ''}`} ref={containerRef}>
      <div className="carousel-wrapper">
        <IdeaCarousel ideas={latestIdeas} />
      </div>
      <div className="content-wrapper">
        <div className="category-filter-container">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`category-filter-pill ${selectedCategoryFilter === 'All' ? 'active' : ''}`}
            onClick={() => handleCategoryFilterPress('All')}
            aria-label="Show all categories"
          >
            All
          </motion.button>
          {['Technology', 'Finance', 'Health', 'Education', 'Retail'].map((cat) => (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`category-filter-pill ${selectedCategoryFilter === cat ? 'active' : ''}`}
              onClick={() => handleCategoryFilterPress(cat)}
              aria-label={`Show ${cat} category`}
            >
              {cat}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="dark-mode-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </motion.button>
        </div>
        {/* Gamification: Daily Streak Display */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gamification-streak">
          <p>Daily Streak: {dailyStreak} 🔥 | Unlock badges by exploring more!</p>
        </motion.div>
        {renderSection('Latest Ideas', latestIdeas, 'latest')}
        {renderSection('Most Popular Ideas', mostPopularIdeas, 'mostPopular')}
        {renderSection('Most Liked Ideas', mostLikedIdeas, 'mostLiked')}
        {renderSection('Most Viewed Ideas', mostViewedIdeas, 'mostViewed')}
        {popularIdeasByCategory.map((section) =>
          renderSection(`Most Popular in ${section.category}`, section.ideas, 'category', section.category)
        )}
        {/* Gamification: Leaderboard Tease */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="leaderboard-tease">
          <h2 className="section-title">Top Contributors</h2>
          <ul>
            {leaderboardTease.map((user, index) => (
              <li key={index}>User {user.user_id}: {user.likes} Likes 🎉</li>
            ))}
          </ul>
          <Link to="/leaderboard">View Full Leaderboard</Link>
        </motion.div>
        <h2 className="section-title">Explore More</h2>
        <div className="explore-grid">
          {renderExploreCard('🔍', 'Discover New Categories', '/category-explore')}
          {renderExploreCard('📈', 'Trending Ideas', '/idea-list?title=Trending Ideas&filterType=trending')}
        </div>
        <button className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
          ↑
        </button>
      </div>
    </div>
  );
};

export default Ideas;