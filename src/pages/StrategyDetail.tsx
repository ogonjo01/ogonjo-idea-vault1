import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import StrategyStepsModal from '@/components/StrategyStepsModal';
import { Heart, Bookmark, Share2 } from 'lucide-react';

function StrategyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [strategy, setStrategy] = useState<any>(null);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
      setLikes(data.likes || 0);
      setViews((data.views || 0) + 1);
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
      showToast(isLiked ? 'Unliked!' : 'Liked!');
    } catch (err) {
      console.error(err);
      showToast('Failed to update like.');
    }
  };

  const handleSaveToggle = async () => {
    if (!user) return navigate('/auth?auth=true');
    setIsSaved((prev) => !prev);
    showToast(isSaved ? 'Unsaved!' : 'Saved!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-500 text-lg p-6 rounded-lg bg-white shadow-md">
          {error || 'Strategy not found.'}
        </div>
      </div>
    );
  }

  const stepsArray = Array.isArray(strategy.strategy_steps?.steps)
    ? strategy.strategy_steps.steps
    : [];

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen p-4 sm:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-gray-900 text-white rounded-lg shadow-xl animate-fade-in-out">
          {toastMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Idea Header */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">{strategy.title}</h1>
          <p className="text-sm font-semibold text-gray-500 mb-4">{strategy.category || 'Uncategorized'}</p>
          <div className="flex items-center space-x-6 text-gray-400 text-sm">
            <span className="flex items-center">
              <span className="mr-1">👀</span> {views}
            </span>
            <span className="flex items-center">
              <span className="mr-1">❤️</span> {likes}
            </span>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed">{strategy.description || 'No description available.'}</p>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 p-4 bg-white rounded-3xl shadow-lg border border-gray-200">
          <button
            className={`flex items-center justify-center p-3 rounded-full transition-colors duration-200 ease-in-out ${
              isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-red-50'
            }`}
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
          >
            <Heart className={`${isLiked ? 'fill-current' : ''}`} size={20} />
          </button>
          <button
            className={`flex items-center justify-center p-3 rounded-full transition-colors duration-200 ease-in-out ${
              isSaved ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50'
            }`}
            onClick={(e) => { e.stopPropagation(); handleSaveToggle(); }}
          >
            <Bookmark className={`${isSaved ? 'fill-current' : ''}`} size={20} />
          </button>
          <button
            className="flex items-center justify-center p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors duration-200 ease-in-out"
            onClick={() => showToast('Share this strategy!')}
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Gamification Bar */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200 flex flex-col sm:flex-row items-center justify-between text-gray-700">
          <span className="font-medium text-lg text-center sm:text-left mb-4 sm:mb-0">
            Progress: 50% - Unlock Full Strategy!
          </span>
          <button
            className="w-full sm:w-auto px-6 py-3 bg-green-500 text-white font-bold rounded-full shadow-md hover:bg-green-600 transition-colors duration-200 ease-in-out transform hover:scale-105"
            onClick={() => setIsModalOpen(true)}
          >
            Read Full Strategy
          </button>
        </div>
      </div>

      {/* Modal for Strategy Steps */}
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