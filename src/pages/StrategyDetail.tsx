import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import StrategyStepsModal from '../components/StrategyStepsModal'; // New component
import './StrategyDetail.css';

interface StrategyMetadata {
  risk_level?: string;
  expected_returns?: string;
}

interface StrategyStep {
  step: string;
  description: string;
}

interface InvestmentStrategyDetail {
  id: string;
  title: string;
  category: string;
  description: string;
  affiliate_link: string | null;
  views: number;
  likes: number;
  risk_level: string;
  expected_returns: string;
  strategy_steps: StrategyStep[];
}

function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [strategy, setStrategy] = useState<InvestmentStrategyDetail | null>(null);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStrategyDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('inv_investment_strategies')
        .select(`
          id,
          title,
          category,
          description,
          affiliate_link,
          views,
          likes,
          risk_level,
          expected_returns,
          strategy_steps
        `)
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        setStrategy(data);
        setLikes(data.likes || 0);
        setViews(data.views || 0);

        await supabase.rpc('increment_views', { strategy_id: id });
        setViews((prev) => prev + 1);

        if (user) {
          const { data: likeData, error: likeError } = await supabase
            .from('user_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('strategy_id', id)
            .single();

          if (likeError && likeError.code !== 'PGRST116') {
            console.error('Error checking like status:', likeError.message);
          } else {
            setIsLiked(!!likeData);
          }
        }
      } else {
        setError('Strategy not found.');
      }
    } catch (err: any) {
      setError(`Failed to load strategy details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchStrategyDetails();
  }, [fetchStrategyDetails]);

  const handleLikePress = async () => {
    if (!user) {
      alert('Please log in to like this strategy.');
      navigate('/auth?auth=true');
      return;
    }

    try {
      if (isLiked) {
        const { error: deleteError } = await supabase
          .from('user_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('strategy_id', id);

        if (deleteError) throw deleteError;
        await supabase.rpc('decrement_likes', { strategy_id: id });
        setLikes((prev) => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        const { error: insertError } = await supabase
          .from('user_likes')
          .insert({ user_id: user.id, strategy_id: id });

        if (insertError) throw insertError;
        await supabase.rpc('increment_likes', { strategy_id: id });
        setLikes((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (err: any) {
      alert('Failed to update like status. Please try again.');
      console.error('Error updating like status:', err.message);
    }
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
      <div className="page-container loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading strategy...</p>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="page-container error-container">
        <p className="error-text">{error || 'Strategy not available or could not be loaded.'}</p>
        <button className="retry-button" onClick={fetchStrategyDetails}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="top-header-container">
        <h1 className="title">{strategy.title}</h1>
        <p className="author">Category: {strategy.category}</p>
        <div className="stats-row">
          <div className="stat-item">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="stat-text">{likes}</span>
          </div>
          <div className="stat-item">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 0a10 10 0 100 20 10 10 0 000-20zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" clipRule="evenodd" />
            </svg>
            <span className="stat-text">{views}</span>
          </div>
          <button className="like-button" onClick={handleLikePress}>
            <svg className={`w-6 h-6 mr-1 ${isLiked ? 'text-red-500' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="like-button-text">{isLiked ? 'Liked' : 'Like'}</span>
          </button>
        </div>
        <div className="divider"></div>
        <h2 className="short-description-header">Strategy Overview:</h2>
        <p className="short-description-text">{strategy.description}</p>
        <button
          className="read-more-button"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="read-more-button-text">View Strategy Steps</span>
          <svg className="w-6 h-6 ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          className="read-more-button bg-green-600 hover:bg-green-700"
          onClick={() => handleInvestClick(strategy.affiliate_link)}
        >
          <span className="read-more-button-text">Invest Now</span>
          <svg className="w-6 h-6 ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {strategy && (
        <div className="links-section">
          <h2 className="links-header">Strategy Insights:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="link-item">
              <p className="font-roboto text-sm text-muted-foreground">Risk Level: {strategy.risk_level || 'N/A'}</p>
            </div>
            <div className="link-item">
              <p className="font-roboto text-sm text-muted-foreground">Expected Returns: {strategy.expected_returns || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {strategy && strategy.strategy_steps && (
        <StrategyStepsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          strategySteps={strategy.strategy_steps}
          strategyTitle={strategy.title}
        />
      )}
    </div>
  );
}

export default StrategyDetail;