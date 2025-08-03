// src/pages/StrategyDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import {
  Card, CardHeader, CardTitle, CardContent,
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui'; // Assume these are available
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
      <Card className="overflow-hidden shadow-2xl border-0">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6">
          <CardTitle className="text-4xl font-extrabold tracking-tight">{title}</CardTitle>
          <p className="text-lg font-medium mt-1">{category}</p>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Investment Synopsis */}
          <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-teal-800">Investment Synopsis</h2>
            <p className="text-gray-700 mt-3 leading-relaxed">{investment_synopsis?.what_is_it || 'Nature of investment unspecified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Offered By:</strong> {investment_synopsis?.who_offers_it || 'Provider not specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Objective:</strong> {investment_synopsis?.goal || 'Goal not defined.'}</p>
            <p className="text-gray-700 mt-2 italic">{investment_synopsis?.fit_check || 'Evaluate alignment with your financial objectives.'}</p>
          </section>

          {/* Returns & Projections */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Returns & Projections</h2>
            <p className="text-gray-700 mt-3"><strong>Expected Returns:</strong> {returns_projections?.expected_returns || 'Not provided.'}</p>
            <p className="text-gray-700 mt-2"><strong>Guarantee Status:</strong> {returns_projections?.guaranteed || 'Not specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Time Horizon:</strong> {returns_projections?.time_horizon || 'Undefined.'}</p>
            <p className="text-gray-700 mt-2 italic">{returns_projections?.examples_check || 'Compare to market averages; beware of exaggerated claims.'}</p>
          </section>

          {/* Risk Assessment */}
          <section className="bg-yellow-50 p-5 rounded-xl border-l-4 border-yellow-400">
            <h2 className="text-2xl font-semibold text-yellow-800">Risk Assessment</h2>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-700">
              {risk_assessment?.potential_issues?.map((issue, i) => <li key={i}>{issue}</li>) || <li>No specific risks identified.</li>}
            </ul>
            <p className="text-gray-700 mt-2"><strong>Capital Risk:</strong> {risk_assessment?.capital_risk || 'Not specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Risk Categories:</strong> {risk_assessment?.risk_types?.join(', ') || 'N/A'}</p>
            <p className="text-gray-700 mt-2"><strong>Legal Risks:</strong> {risk_assessment?.legal_risks || 'None noted.'}</p>
            <p className="text-gray-700 mt-2 italic">{risk_assessment?.affordability_check || 'Assess if you can sustain a potential loss.'}</p>
          </section>

          {/* Historical Performance */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Historical Performance</h2>
            <p className="text-gray-700 mt-3"><strong>Past Results:</strong> {historical_performance?.past_performance || 'Data unavailable.'}</p>
            <p className="text-gray-700 mt-2"><strong>Verifiable Data:</strong> {historical_performance?.verifiable_data || 'Not provided.'}</p>
            <p className="text-gray-700 mt-2"><strong>Downturn Performance:</strong> {historical_performance?.downturn_performance || 'Not specified.'}</p>
            <p className="text-gray-700 mt-2 italic">{historical_performance?.disclaimer_check || 'Past performance does not guarantee future outcomes.'}</p>
          </section>

          {/* Liquidity Profile */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Liquidity Profile</h2>
            <p className="text-gray-700 mt-3"><strong>Withdrawal Ease:</strong> {liquidity_profile?.ease_of_withdrawal || 'Not detailed.'}</p>
            <p className="text-gray-700 mt-2"><strong>Lock-in Period:</strong> {liquidity_profile?.lock_in_period || 'None specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Penalties:</strong> {liquidity_profile?.penalties || 'Not applicable.'}</p>
            <p className="text-gray-700 mt-2 italic">{liquidity_profile?.exit_check || 'Confirm your exit options prior to investment.'}</p>
          </section>

          {/* Cost Structure */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Cost Structure</h2>
            <p className="text-gray-700 mt-3"><strong>Fees:</strong> {cost_structure?.management_fees || 'Not disclosed.'}</p>
            <p className="text-gray-700 mt-2"><strong>Hidden Costs:</strong> {cost_structure?.hidden_costs || 'None reported.'}</p>
            <p className="text-gray-700 mt-2 italic">{cost_structure?.impact_check || 'Evaluate fee impact on long-term returns.'}</p>
          </section>

          {/* Management Team */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Management Team</h2>
            <p className="text-gray-700 mt-3"><strong>Key Personnel:</strong> {management_team?.key_personnel || 'Not specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Track Record:</strong> {management_team?.track_record || 'Unavailable.'}</p>
            <p className="text-gray-700 mt-2"><strong>Credentials:</strong> {management_team?.credentials || 'Not provided.'}</p>
            <p className="text-gray-700 mt-2"><strong>Conflicts:</strong> {management_team?.conflicts || 'None noted.'}</p>
            <p className="text-gray-700 mt-2 italic">{management_team?.trust_check || 'A reputable team enhances credibility.'}</p>
          </section>

          {/* Legal Compliance */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Legal Compliance</h2>
            <p className="text-gray-700 mt-3"><strong>Regulatory Body:</strong> {legal_compliance?.regulatory_body || 'Not regulated.'}</p>
            <p className="text-gray-700 mt-2"><strong>Documentation:</strong> {legal_compliance?.documentation || 'Not available.'}</p>
            <p className="text-gray-700 mt-2"><strong>Legal History:</strong> {legal_compliance?.legal_history || 'No issues reported.'}</p>
            <p className="text-gray-700 mt-2 italic">{legal_compliance?.scam_check || 'Unregulated offerings may indicate higher scam risk.'}</p>
          </section>

          {/* Operational Mechanics */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Operational Mechanics</h2>
            <p className="text-gray-700 mt-3"><strong>Return Generation:</strong> {operational_mechanics?.return_generation || 'Mechanism unspecified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Investment Allocation:</strong> {operational_mechanics?.investment_allocation || 'Not detailed.'}</p>
            <p className="text-gray-700 mt-2"><strong>Contingency Plan:</strong> {operational_mechanics?.contingency_plan || 'Not provided.'}</p>
            <p className="text-gray-700 mt-2 italic">{operational_mechanics?.simplicity_check || 'Ensure you understand the investment process.'}</p>
          </section>

          {/* Personal Alignment */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Personal Alignment</h2>
            <p className="text-gray-700 mt-3"><strong>Risk Tolerance:</strong> {personal_alignment?.risk_tolerance || 'Not assessed.'}</p>
            <p className="text-gray-700 mt-2"><strong>Income Needs:</strong> {personal_alignment?.income_needs || 'Not specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Tax Strategy:</strong> {personal_alignment?.tax_strategy || 'Not considered.'}</p>
            <p className="text-gray-700 mt-2"><strong>Diversification:</strong> {personal_alignment?.diversification || 'Not evaluated.'}</p>
            <p className="text-gray-700 mt-2 italic">{personal_alignment?.suitability_check || 'Verify compatibility with your financial profile.'}</p>
          </section>

          {/* Exit Strategy */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Exit Strategy</h2>
            <p className="text-gray-700 mt-3"><strong>Exit Process:</strong> {exit_strategy?.exit_process || 'Not outlined.'}</p>
            <p className="text-gray-700 mt-2"><strong>Transferability:</strong> {exit_strategy?.transferability || 'Not specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Buyer Availability:</strong> {exit_strategy?.buyer_availability || 'Not detailed.'}</p>
            <p className="text-gray-700 mt-2 italic">{exit_strategy?.plan_check || 'Plan your exit before committing.'}</p>
          </section>

          {/* Key Metrics */}
          <section className="bg-white p-5 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-teal-800">Key Metrics</h2>
            <p className="text-gray-700 mt-3"><strong>ROI:</strong> {key_metrics?.roi || 'Not calculated.'}</p>
            <p className="text-gray-700 mt-2"><strong>NPV:</strong> {key_metrics?.npv || 'Not available.'}</p>
            <p className="text-gray-700 mt-2"><strong>IRR:</strong> {key_metrics?.irr || 'Not provided.'}</p>
            <p className="text-gray-700 mt-2"><strong>Payback Period:</strong> {key_metrics?.payback_period || 'Not specified.'}</p>
            <p className="text-gray-700 mt-2"><strong>Cash Flow:</strong> {key_metrics?.cash_flow || 'Not detailed.'}</p>
            <p className="text-gray-700 mt-2 italic">{key_metrics?.analysis_check || 'Analyze metrics for true investment value.'}</p>
          </section>

          {/* Red Flags */}
          <section className="bg-yellow-50 p-5 rounded-xl border-l-4 border-yellow-400">
            <h2 className="text-2xl font-semibold text-yellow-800">Red Flags</h2>
            <p className="text-gray-700 mt-3"><strong>Pressure Tactics:</strong> {red_flags?.pressure_tactics || 'None observed.'}</p>
            <p className="text-gray-700 mt-2"><strong>Clarity Issues:</strong> {red_flags?.clarity_issues || 'Not noted.'}</p>
            <p className="text-gray-700 mt-2"><strong>Risk Hype:</strong> {red_flags?.risk_hype || 'No excessive promotion.'}</p>
            <p className="text-gray-700 mt-2 italic">{red_flags?.instinct_check || 'Trust your intuition and investigate further if uneasy.'}</p>
          </section>

          {/* Stats and Actions */}
          <section className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl">
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
        </CardContent>
      </Card>
    </div>
  );
}

export default StrategyDetail;