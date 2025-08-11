import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import StrategyCard from '@/components/StrategyCard';
import { motion } from 'framer-motion';
import './StrategyList.css';

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

const StrategyList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const title = searchParams.get('title') || 'All Strategies';
  const filter = searchParams.get('filter') || 'latest';
  const [strategies, setStrategies] = useState<InvestmentStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('inv_investment_strategies')
        .select('id, title, category, description, affiliate_link, views, likes, created_at')
        .eq('is_active', true);

      switch (filter) {
        case 'latest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'mostpopular':
          query = query.order('views', { ascending: false });
          break;
        case 'mostliked':
          query = query.order('likes', { ascending: false });
          break;
        case 'top in':
          query = query.order('views', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error: supabaseError } = await query;
      if (supabaseError) throw supabaseError;
      setStrategies(data || []);
    } catch (err: any) {
      setError(`Failed to load strategies: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading strategies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchStrategies}>Retry</button>
      </div>
    );
  }

  return (
    <div className="strategy-list-container">
      <h1 className="strategy-list-title">{decodeURIComponent(title)}</h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="strategy-grid"
      >
        {strategies.length > 0 ? (
          strategies.map((item) => (
            <motion.div
              key={item.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 * strategies.indexOf(item), duration: 0.5 }}
            >
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
                className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              />
            </motion.div>
          ))
        ) : (
          <div className="empty-state-container">
            <p className="empty-state-text">No strategies available.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StrategyList;