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

const Dashboard: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const { user, loading: authLoading } = useAuth();
  const [strategies, setStrategies] = useState<InvestmentStrategy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredStrategies, setFilteredStrategies] = useState<InvestmentStrategy[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  const fetchControllerRef = useRef<AbortController | null>(null);

  // fixed category order from constants with 'All' prepended
  const allCategories = useMemo(() => ['All', ...INVESTMENT_CATEGORIES], []);

  // Fetch strategies from Supabase
  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // cancel previous fetch if any
      fetchControllerRef.current?.abort();
      fetchControllerRef.current = new AbortController();

      const { data, error: supabaseError } = await supabase
        .from('inv_investment_strategies')
        .select('id, title, category, description, affiliate_link, views, likes, created_at, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      if (data) {
        // For each strategy, check if the current user liked it
        const strategiesWithLikes: InvestmentStrategy[] = await Promise.all(
          data.map(async (strategy: any) => {
            let isLiked = false;
            if (user) {
              try {
                const { data: likeData } = await supabase
                  .from('inv_user_likes')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('strategy_id', strategy.id)
                  .maybeSingle();
                isLiked = !!likeData;
              } catch {
                isLiked = false;
              }
            }
            return {
              id: strategy.id,
              title: strategy.title,
              category: strategy.category || 'Uncategorized',
              description: strategy.description || '',
              affiliate_link: strategy.affiliate_link || null,
              views: strategy.views || 0,
              likes: strategy.likes || 0,
              isLiked,
              created_at: strategy.created_at,
            } as InvestmentStrategy;
          })
        );
        setStrategies(strategiesWithLikes);
      } else {
        setStrategies([]);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // ignore
      } else {
        console.error('Failed to load strategies:', err);
        setError(`Failed to load strategies: ${err?.message || String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStrategies();
    return () => {
      fetchControllerRef.current?.abort();
    };
  }, [fetchStrategies]);

  // Debounce search/filter
  useEffect(() => {
    const t = setTimeout(() => {
      let current = [...strategies];

      if (selectedCategory !== 'All') {
        current = current.filter((s) => (s.category || 'Uncategorized') === selectedCategory);
      }

      const q = (searchQuery || '').trim().toLowerCase();
      if (q.length > 0) {
        current = current.filter(
          (s) =>
            s.title?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            (s.category || '').toLowerCase().includes(q)
        );
      }

      setFilteredStrategies(current);
    }, 240);

    return () => clearTimeout(t);
  }, [searchQuery, selectedCategory, strategies]);

  useEffect(() => {
    if (!authLoading && !user) {
      // if unauthenticated, navigate to landing
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  const handleCategoryFilterPress = useCallback((category: string) => {
    setSelectedCategory(category);
    // clear search when a category is picked
    setSearchQuery('');
  }, []);

  const handleStrategyClick = (id: string) => {
    navigate(`/strategy-detail/${id}`);
  };

  const handleInvestClick = (affiliateLink: string | null) => {
    if (affiliateLink) {
      window.open(affiliateLink, '_blank');
    } else {
      alert('Investment link not available for this strategy.');
    }
  };

  const calculatePopularityScore = (views = 0, likes = 0) => {
    return Math.min(Math.round((views * 0.4 + likes * 0.6) / 10), 100);
  };

  // Render a horizontal section (carousel like)
  const renderStrategySection = useCallback((title: string, data: InvestmentStrategy[]) => {
    if (!data || data.length === 0) return null;
    return (
      <div className="section-container" key={title}>
        <div className="section-header-row">
          <h2 className="section-header">{title}</h2>
          <button
            className="see-all-button"
            onClick={() => {
              const filterType = encodeURIComponent(title);
              navigate(`/strategy-list?title=${filterType}`);
            }}
            aria-label={`See all ${title}`}
          >
            See All <span className="chevron-icon">›</span>
          </button>
        </div>

        <div className="horizontal-list" role="list">
          {data.map((item) => (
            <div className="horizontal-item" key={item.id} role="listitem">
              <StrategyCard
                id={item.id}
                title={item.title}
                category={item.category}
                description={item.description}
                views={item.views}
                likes={item.likes}
                isLiked={item.isLiked}
                onClick={() => handleStrategyClick(item.id)}
                onInvest={() => handleInvestClick(item.affiliate_link)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }, [navigate]);

  if (loading && strategies.length === 0) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p className="loading-text">Loading investment strategies...</p>
      </div>
    );
  }

  if (error && strategies.length === 0) {
    return (
      <div className="error-container">
        <AlertTriangle size={28} color="#e53e3e" />
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={() => fetchStrategies()}>
          Retry
        </button>
      </div>
    );
  }

  // Prepare section data (examples: latest, popular)
  const latest = [...strategies].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8);
  const popular = [...strategies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);

  // group by category for "Top in X"
  const groupedByCategory = Object.entries(
    strategies.reduce((acc: Record<string, InvestmentStrategy[]>, s) => {
      const key = s.category || 'Uncategorized';
      acc[key] = acc[key] || [];
      acc[key].push(s);
      return acc;
    }, {})
  );

  return (
    <div className="safe-area">
      <div className="carousel-wrapper" style={{ zIndex: 5 }}>
        <StrategyCarousel strategies={strategies} />
      </div>

      <div className="content-wrapper" style={{ zIndex: 10, position: 'relative' }}>
        <div className="search-container" aria-hidden={false}>
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by title, category, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search strategies"
          />
          {searchQuery.length > 0 && (
            <button className="clear-search-button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        {/* Category filter: horizontal scroll on mobile, wrap on desktop */}
        <div
          className="category-filter-container"
          role="tablist"
          aria-label="Investment categories"
        >
          {allCategories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-pressed={selectedCategory === cat}
              onClick={() => handleCategoryFilterPress(cat)}
              className={`category-filter-pill ${selectedCategory === cat ? 'category-filter-pill-active' : ''}`}
              tabIndex={0}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        {searchQuery.trim() !== '' || selectedCategory !== 'All' ? (
          filteredStrategies.length > 0 ? (
            <div className="filtered-results-container">
              <h2 className="section-header">Search Results</h2>
              <div className="horizontal-list">
                {filteredStrategies.map((item) => (
                  <div className="horizontal-item" key={item.id}>
                    <StrategyCard
                      id={item.id}
                      title={item.title}
                      category={item.category}
                      description={item.description}
                      views={item.views}
                      likes={item.likes}
                      isLiked={item.isLiked}
                      onClick={() => handleStrategyClick(item.id)}
                      onInvest={() => handleInvestClick(item.affiliate_link)}
                    />
                  </div>
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
            {renderStrategySection('Latest Strategies', latest)}
            {renderStrategySection('Most Popular Strategies', popular)}
            {groupedByCategory.map(([category, items]) =>
              renderStrategySection(`Top in ${category}`, items.slice(0, 8))
            )}
            <div className="ad-banner">Ad: Expert Investment Tools - Join Now</div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
