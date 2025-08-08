// src/pages/StrategyDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import StrategyStepsModal from '@/components/StrategyStepsModal';

function StrategyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [strategy, setStrategy] = useState<any>(null);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inv_investment_strategies')
        .select('*, strategy_steps')
        .eq('id', id)
        .single();
      if (error) throw error;
      setStrategy(data);
      setLikes(data.likes);
      setViews(data.views + 1);
      await supabase.rpc('increment_views', { strategy_id: id });
      if (user) {
        const { data: likeData } = await supabase
          .from('user_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('strategy_id', id)
          .single();
        setIsLiked(!!likeData);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading strategy');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleLike = async () => {
    if (!user) return navigate('/auth?auth=true');
    try {
      if (isLiked) {
        await supabase.from('user_likes').delete().eq('user_id', user.id).eq('strategy_id', id);
        await supabase.rpc('decrement_likes', { strategy_id: id });
        setLikes(l => Math.max(0, l - 1));
      } else {
        await supabase.from('user_likes').insert({ user_id: user.id, strategy_id: id });
        await supabase.rpc('increment_likes', { strategy_id: id });
        setLikes(l => l + 1);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="loader" /></div>;
  if (error || !strategy) return <div className="text-red-600 text-center p-6">{error || 'Strategy not found'}</div>;

  // Extract steps array
  const stepsArray = Array.isArray(strategy.strategy_steps?.steps)
    ? strategy.strategy_steps.steps
    : [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="bg-gradient-to-r from-blue-600 to-teal-500 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold">{strategy.title}</h1>
        <p className="mt-2 text-lg opacity-90">{strategy.category}</p>
      </header>

      <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-800">Overview</h2>
        <p className="mt-3 text-gray-700 leading-relaxed">{strategy.description}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <span className="block text-xl font-semibold text-gray-800">{likes} ❤️</span>
          <span className="text-gray-500">Endorsements</span>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
          <span className="block text-xl font-semibold text-gray-800">{views}</span>
          <span className="text-gray-500">Views</span>
        </div>
        <button
          onClick={handleLike}
          className={`${isLiked ? 'bg-red-500' : 'bg-gray-700'} text-white p-4 rounded-lg shadow-lg hover:scale-105 transform transition`}
        >
          {isLiked ? 'Endorsed' : 'Endorse'}
        </button>
      </section>

      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-gradient-to-r from-teal-500 to-blue-500 text-white p-4 rounded-lg font-semibold hover:shadow-xl transition"
      >
        Read Full Strategy
      </button>

      <StrategyStepsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        strategySteps={stepsArray}
        strategyTitle={strategy.title}
      />
    </div>
  );
}

export default StrategyDetail;