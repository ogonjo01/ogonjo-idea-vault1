import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase';
import StrategyCard from '@/components/StrategyCard';
import { INVESTMENT_CATEGORIES } from '@/constants/investmentCategories';
import StrategyCarousel from './StrategyCarousel';
import './Dashboard.css';
import { AlertTriangle } from 'lucide-react';

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

const Dashboard = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const { user, loading: authLoading } = useAuth();
  const [strategies, setStrategies] = useState<InvestmentStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredStrategies, setFilteredStrategies] = useState<InvestmentStrategy[]>([]);

  const initialLoad = useRef(true);
  const searchDebounceRef = useRef<number>();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  // Fetch investment strategies
  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('inv_investment_strategies')
          .select('id, title, category, description, affiliate_link, views, likes, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;
        if (data) {
          const strategiesWithLikes = await Promise.all(data.map(async (strategy) => {
            if (user) {
              const { data: likeData } = await supabase
                .from('inv_user_likes')
                .select('id')
                .eq('user_id', user.id)
                .eq('strategy_id', strategy.id)
                .single();
              return { ...strategy, isLiked: !!likeData };
            }
            return { ...strategy, isLiked: false };
          }));
          setStrategies(strategiesWithLikes);
        }
      } catch (err: any) {
        setError(`Failed to load strategies: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [user]);

  // Debounce search and filter
  useEffect(() => {
    if (authLoading) return;
    const handler = setTimeout(() => {
      let currentFiltered = [...strategies];
      if (selectedCategory !== 'All') {
        currentFiltered = currentFiltered.filter(s => s.category === selectedCategory);
      }
      if (searchQuery.trim() !== '') {
        const lowercasedSearch = searchQuery.trim().toLowerCase();
        currentFiltered = currentFiltered.filter(
          s =>
            s.title.toLowerCase().includes(lowercasedSearch) ||
            s.description.toLowerCase().includes(lowercasedSearch) ||
            s.category?.toLowerCase().includes(lowercasedSearch)
        );
      }
      setFilteredStrategies(currentFiltered);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategory, strategies, authLoading]);

  const handleCategoryFilterPress = useCallback((category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
  }, []);

  const renderStrategySection = useCallback((title: string, data: InvestmentStrategy[]) => {
    if (data.length === 0) return null;
    return (
      <div className="section-container">
        <div className="section-header-row">
          <h2 className="section-header">{title}</h2>
          <button
            className="see-all-button"
            onClick={() => {
              const filterType = title.toLowerCase().replace(' strategies', '').replace('top in ', '');
              navigate(`/strategy-list?title=${encodeURIComponent(title)}&filter=${filterType}`);
            }}
          >
            See All <span className="chevron-icon">›</span>
          </button>
        </div>
        <div className="horizontal-list">
          {data.map((item) => (
            <StrategyCard
              key={item.id}
              id={item.id}
              title={item.title}
              category={item.category}
              description={item.description}
              views={item.views}
              likes={item.likes}
              isLiked={item.isLiked}
              onClick={() => handleStrategyClick(item.id)}
              onInvest={() => handleInvestClick(item.affiliate_link)}
              className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            />
          ))}
        </div>
      </div>
    );
  }, []);

  const handleStrategyClick = (id: string) => {
    navigate(`/strategy-detail/${id}`);
  };

  const handleInvestClick = (affiliateLink: string | null) => {
    if (affiliateLink) {
      window.open(affiliateLink, '_blank'); // Fixed typo: affiliate_link -> affiliateLink
    } else {
      alert('Investment link not available for this strategy.');
    }
  };

  if (loading && strategies.length === 0) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p className="loading-text">Loading investment strategies...</p>
      </div>
    );
  }

  if (error && strategies.length === 0) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={() => fetchStrategies()}>Retry</button>
      </div>
    );
  }

  const allCategories = ['All', ...new Set(strategies.map(s => s.category).filter(Boolean))];

  return (
    <div className="safe-area">
      <div className="carousel-wrapper" style={{ zIndex: 5 }}>
        <StrategyCarousel strategies={strategies} />
      </div>
      <div className="content-wrapper" style={{ zIndex: 10, position: 'relative' }}>
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by title, category, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button className="clear-search-button" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
        <div className="category-filter-container sticky">
          {allCategories.map((cat) => (
            <button
              key={cat}
              className={`category-filter-pill ${selectedCategory === cat ? 'category-filter-pill-active' : ''}`}
              onClick={() => handleCategoryFilterPress(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        {(searchQuery.trim() !== '' || selectedCategory !== 'All') ? (
          filteredStrategies.length > 0 ? (
            <div className="filtered-results-container">
              <h2 className="section-header">Search Results</h2>
              <div className="horizontal-list">
                {filteredStrategies.map((item) => (
                  <StrategyCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    category={item.category}
                    description={item.description}
                    views={item.views}
                    likes={item.likes}
                    isLiked={item.isLiked}
                    onClick={() => handleStrategyClick(item.id)}
                    onInvest={() => handleInvestClick(item.affiliate_link)}
                    className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state-container">
              <p className="empty-state-text">No strategies found.</p>
            </div>
          )
        ) : (
          <>
            <div className="ad-banner">Ad: Invest with Confidence - Free Trial</div>
            {renderStrategySection('Latest Strategies', [...strategies].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6))}
            {renderStrategySection('Most Popular Strategies', [...strategies].sort((a, b) => b.views - a.views).slice(0, 6))}
            {Object.entries(
              strategies.reduce((acc, strategy) => {
                if (strategy.category) acc[strategy.category] = [...(acc[strategy.category] || []), strategy];
                return acc;
              }, {} as { [key: string]: InvestmentStrategy[] })
            ).map(([category, strategies]) =>
              renderStrategySection(`Top in ${category}`, strategies.sort((a, b) => b.views - a.views).slice(0, 6))
            )}
            <div className="ad-banner">Ad: Expert Investment Tools - Join Now</div>
            <div className="ad-banner">Ad: Maximize Returns with OGONJO</div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;