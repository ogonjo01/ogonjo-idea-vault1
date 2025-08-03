// src/pages/StrategyDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import StrategyStepsModal from '../components/StrategyStepsModal';
import './StrategyDetail.css';

interface StrategyStep {
  step_number: number;
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
  risk_level: string | null;
  expected_returns: string | null;
  strategy_steps: StrategyStep[] | null;
  investment_synopsis?: { what_is_it?: string; who_offers_it?: string; goal?: string; fit_check?: string };
  returns_projections?: { expected_returns?: string; guaranteed?: string; time_horizon?: string; examples_check?: string };
  risk_assessment?: { potential_issues?: string[]; capital_risk?: string; risk_types?: string[]; legal_risks?: string[]; affordability_check?: string };
  historical_performance?: { past_performance?: string; verifiable_data?: string; downturn_performance?: string; disclaimer_check?: string };
  liquidity_profile?: { ease_of_withdrawal?: string; lock_in_period?: string; penalties?: string; exit_check?: string };
  cost_structure?: { management_fees?: string; hidden_costs?: string; impact_check?: string };
  management_team?: { key_personnel?: string; track_record?: string; credentials?: string; conflicts?: string; trust_check?: string };
  legal_compliance?: { regulatory_body?: string; documentation?: string; legal_history?: string; scam_check?: string };
  operational_mechanics?: { return_generation?: string; investment_allocation?: string; contingency_plan?: string; simplicity_check?: string };
  personal_alignment?: { risk_tolerance?: string; income_needs?: string; tax_strategy?: string; diversification?: string; suitability_check?: string };
  exit_strategy?: { exit_process?: string; transferability?: string; buyer_availability?: string; plan_check?: string };
  key_metrics?: { roi?: string; npv?: string; irr?: string; payback_period?: string; cash_flow?: string; analysis_check?: string };
  red_flags?: { pressure_tactics?: string; clarity_issues?: string; risk_hype?: string; instinct_check?: string };
}

function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [strategy, setStrategy] = useState<InvestmentStrategyDetail | null>(null);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
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
          id, title, category, description, affiliate_link, views, likes,
          risk_level, expected_returns, strategy_steps, investment_synopsis,
          returns_projections, risk_assessment, historical_performance,
          liquidity_profile, cost_structure, management_team, legal_compliance,
          operational_mechanics, personal_alignment, exit_strategy, key_metrics,
          red_flags
        `)
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        const parsed: any = { ...data };
        [
          'strategy_steps', 'investment_synopsis', 'returns_projections',
          'risk_assessment', 'historical_performance', 'liquidity_profile',
          'cost_structure', 'management_team', 'legal_compliance',
          'operational_mechanics', 'personal_alignment', 'exit_strategy',
          'key_metrics', 'red_flags'
        ].forEach((field) => {
          if (typeof parsed[field] === 'string') {
            try { parsed[field] = JSON.parse(parsed[field]); } catch { /* leave as-is */ }
          }
        });

        setStrategy(parsed as InvestmentStrategyDetail);
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
          if (!likeError) setIsLiked(!!likeData);
        }
      } else {
        setError('Investment strategy not found.');
      }
    } catch (err: any) {
      setError(`Failed to retrieve strategy details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { fetchStrategyDetails(); }, [fetchStrategyDetails]);

  const handleLikePress = async () => {
    if (!user) {
      alert('Please authenticate to endorse this strategy.');
      navigate('/auth?auth=true');
      return;
    }

    try {
      if (isLiked) {
        await supabase.from('user_likes').delete().eq('user_id', user.id).eq('strategy_id', id);
        await supabase.rpc('decrement_likes', { strategy_id: id });
        setLikes((prev) => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        await supabase.from('user_likes').insert({ user_id: user.id, strategy_id: id });
        await supabase.rpc('increment_likes', { strategy_id: id });
        setLikes((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (err: any) {
      alert('Unable to update endorsement status.');
      console.error('Error updating endorsement:', err.message);
    }
  };

  const handleInvestClick = (affiliateLink: string | null) => {
    if (affiliateLink) window.open(affiliateLink, '_blank');
    else alert('Investment opportunity link unavailable.');
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
    </div>
  );
  if (error || !strategy) return (
    <div className="text-center py-10">
      <p className="text-red-600">{error || 'Investment strategy not found.'}</p>
      <button className="mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700" onClick={fetchStrategyDetails}>
        Retry
      </button>
    </div>
  );

  const {
    title, category, description,
    risk_level, expected_returns,
    investment_synopsis, returns_projections,
    risk_assessment, historical_performance,
    liquidity_profile, cost_structure,
    management_team, legal_compliance,
    operational_mechanics, personal_alignment,
    exit_strategy, key_metrics, red_flags,
  } = strategy;

  return (
    <div className="strategy-detail container mx-auto p-6 max-w-4xl">
      <div className="bg-white overflow-hidden shadow-2xl rounded-xl border-0">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6">
          <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-lg font-medium mt-1">{category}</p>
        </div>
        <div className="p-6 space-y-8">
          <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-teal-800">Summary</h2>
            <p className="text-gray-700 mt-3 leading-relaxed">{description}</p>
          </section>
          <section className="flex justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl">
            <div className="text-center md:text-left">
              <p className="text-lg font-medium text-gray-900">Endorsements: {likes} ❤️</p>
              <p className="text-lg font-medium text-gray-900">Views: {views} 👁️</p>
            </div>
            <div className="flex gap-4">
              <button
                className={`px-4 py-2 rounded-lg text-white ${isLiked ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                onClick={handleLikePress}
              >
                {isLiked ? 'Endorsed' : 'Endorse'}
              </button>
              {strategy.affiliate_link && (
                <button
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  onClick={() => handleInvestClick(strategy.affiliate_link)}
                >
                  Invest Now
                </button>
              )}
            </div>
          </section>
          <button
            className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-all duration-200 shadow-md"
            onClick={() => setIsModalOpen(true)}
          >
            Read More
          </button>
        </div>
      </div>
      <StrategyStepsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        strategySteps={strategy.strategy_steps || []}
        strategyTitle={title}
        investmentData={strategy}
      />
    </div>
  );
}

export default StrategyDetail;