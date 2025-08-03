import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import StrategyStepsModal from '../components/StrategyStepsModal';
import './StrategyDetail.css';

interface StrategyStep {
  step_number: number;
  description: string;
}

interface BookRec {
  title: string;
  affiliate_link: string;
  retail_link?: string;
}

interface Quote {
  quote: string;
  source?: string;
}

interface StrategyInsights {
  overview: string;
  why_it_matters?: string;
  how_it_works?: string;
  key_considerations?: string[];
  steps: StrategyStep[];
  book_recommendations?: BookRec[];
  memorable_quotes?: Quote[];
}

interface InvestmentStrategyDetail {
  id: string;
  title: string;
  category: string;
  affiliate_link: string | null;
  views: number;
  likes: number;
  risk_level: string;
  expected_returns: string;
  strategy_insights: StrategyInsights;
}

export default function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [strategy, setStrategy] = useState<InvestmentStrategyDetail | null>(null);
  const [likes, setLikes]       = useState(0);
  const [views, setViews]       = useState(0);
  const [isLiked, setIsLiked]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error: sbErr } = await supabase
        .from('inv_investment_strategies')
        .select(`id,title,category,affiliate_link,views,likes,
                  risk_level,expected_returns,strategy_insights`)
        .eq('id', id)
        .single();

      if (sbErr) throw sbErr;
      if (!data) throw new Error('Not found');

      // parse JSONB if returned as text
      const insights: StrategyInsights =
        typeof data.strategy_insights === 'string'
          ? JSON.parse(data.strategy_insights)
          : data.strategy_insights;

      setStrategy({ ...data, strategy_insights: insights });
      setLikes(data.likes);
      setViews(data.views);
      // increment view count
      await supabase.rpc('increment_views', { strategy_id: id });
      setViews(v => v + 1);

      // check like status
      if (user) {
        const { data: likeData } = await supabase
          .from('user_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('strategy_id', id)
          .single();
        setIsLiked(!!likeData);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const toggleLike = async () => {
    if (!user) {
      navigate('/auth?auth=true');
      return;
    }
    try {
      if (isLiked) {
        await supabase
          .from('user_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('strategy_id', id);
        await supabase.rpc('decrement_likes', { strategy_id: id });
        setLikes(l => l - 1);
      } else {
        await supabase
          .from('user_likes')
          .insert({ user_id: user.id, strategy_id: id });
        await supabase.rpc('increment_likes', { strategy_id: id });
        setLikes(l => l + 1);
      }
      setIsLiked(l => !l);
    } catch {
      alert('Failed to update like');
    }
  };

  const openAffiliate = () => {
    if (strategy?.affiliate_link) window.open(strategy.affiliate_link, '_blank');
    else alert('No affiliate link');
  };

  if (loading) return <p className="loading">Loading…</p>;
  if (error || !strategy) return (
    <div className="error">
      <p>{error || 'Strategy not found'}</p>
      <button onClick={fetchDetails}>Retry</button>
    </div>
  );

  const { strategy_insights: ins } = strategy;

  return (
    <div className="strategy-detail">
      <header>
        <h1>{strategy.title}</h1>
        <span className="category">{strategy.category}</span>
        <div className="stats">
          <button onClick={toggleLike} className={isLiked ? 'liked' : ''}>
            ❤️ {likes}
          </button>
          <span>👁️ {views}</span>
        </div>
      </header>

      <section className="overview">
        <h2>Overview</h2>
        <p>{ins.overview}</p>
      </section>

      {ins.why_it_matters && (
        <section className="why-matters">
          <h2>Why It Matters</h2>
          <p>{ins.why_it_matters}</p>
        </section>
      )}

      {ins.how_it_works && (
        <section className="how-it-works">
          <h2>How It Works</h2>
          <p>{ins.how_it_works}</p>
        </section>
      )}

      {ins.key_considerations?.length > 0 && (
        <section className="key-considerations">
          <h2>Key Considerations</h2>
          <ul>
            {ins.key_considerations.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </section>
      )}

      <section className="steps-preview">
        <h2>Steps</h2>
        <button onClick={() => setModalOpen(true)}>View All Steps</button>
      </section>

      {ins.book_recommendations?.length > 0 && (
        <section className="books">
          <h2>Recommended Reading</h2>
          <ul>
            {ins.book_recommendations.map((b, i) => (
              <li key={i}>
                <span>{b.title}</span>
                <a
                  href={b.affiliate_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="affiliate-btn"
                >
                  Buy (Affiliate)
                </a>
                {b.retail_link && (
                  <a
                    href={b.retail_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="retail-link"
                  >
                    (Retail)
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ins.memorable_quotes?.length > 0 && (
        <section className="quotes">
          <h2>Memorable Quotes</h2>
          {ins.memorable_quotes.map((q, i) => (
            <blockquote key={i}>
              “{q.quote}”{q.source && <cite>— {q.source}</cite>}
            </blockquote>
          ))}
        </section>
      )}

      <footer>
        <button onClick={openAffiliate} className="invest-btn">
          Invest Now
        </button>
      </footer>

      <StrategyStepsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        strategySteps={ins.steps}
        strategyTitle={strategy.title}
      />
    </div>
  );
}
