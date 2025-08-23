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

  // Fetch details & refresh counts
  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      // 1) fetch strategy row
      const { data, error } = await supabase
        .from('inv_investment_strategies')
        .select('*, strategy_steps')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Strategy not found');
        setStrategy(null);
        return;
      }

      setStrategy(data);
      setLikes(data.likes || 0);
      setViews(data.views || 0);

      // 2) increment views (RPC) -> then re-fetch views to ensure DB persisted value
      const { error: viewsError } = await supabase.rpc('increment_strategy_views', { strategy_id_param: id });
      if (viewsError) {
        console.error('Views RPC error:', viewsError);
      } else {
        const { data: updatedData, error: updatedError } = await supabase
          .from('inv_investment_strategies')
          .select('views')
          .eq('id', id)
          .maybeSingle();
        if (!updatedError && updatedData) setViews(updatedData.views || 0);
      }

      // 3) check if current user liked (use maybeSingle to avoid errors when no row)
      if (user) {
        const { data: likeData, error: likeError } = await supabase
          .from('inv_user_likes')
          .select('id')
          .eq('strategy_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likeError) {
          console.error('Like check error:', likeError);
        } else {
          setIsLiked(!!likeData);
        }
      } else {
        setIsLiked(false);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Error loading strategy');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (id) fetchDetails();
  }, [id, fetchDetails]);

  // Like / Unlike — rely on DB trigger to update inv_investment_strategies.likes
  const handleLike = async () => {
    if (!user) {
      showToast('Please sign in to like strategies.');
      navigate('/auth?auth=true');
      return;
    }

    try {
      const newIsLiked = !isLiked;

      if (isLiked) {
        // UNLIKE — delete the user's like row
        const { error: deleteError } = await supabase
          .from('inv_user_likes')
          .delete()
          .match({ strategy_id: id, user_id: user.id });

        if (deleteError) throw deleteError;

        // optimistic UI update
        setIsLiked(false);
        setLikes(prev => Math.max(0, prev - 1));
      } else {
        // LIKE — insert the like row
        const { data: inserted, error: insertError } = await supabase
          .from('inv_user_likes')
          .insert([{ strategy_id: id, user_id: user.id }])
          .select();

        if (insertError) {
          // conflict (unique constraint) might return error; handle gracefully
          console.error('Insert like error:', insertError);
          throw insertError;
        }

        setIsLiked(true);
        setLikes(prev => prev + 1);
      }

      showToast(newIsLiked ? 'Liked!' : 'Unliked!');

      // refresh authoritative counts (trigger updates likes column in DB)
      // small debounce: fetchDetails will re-run views increment (ok), but we want fresh likes
      const { data: refreshed, error: refreshedError } = await supabase
        .from('inv_investment_strategies')
        .select('likes')
        .eq('id', id)
        .maybeSingle();
      if (!refreshedError && refreshed) setLikes(refreshed.likes || 0);
    } catch (err: any) {
      console.error('Like error:', err);
      showToast('Failed to update like.');
      // revert optimistic update by re-fetching
      await fetchDetails();
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      showToast('Please sign in to save strategies.');
      navigate('/auth?auth=true');
      return;
    }
    setIsSaved(prev => !prev);
    showToast(isSaved ? 'Unsaved!' : 'Saved!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: strategy?.title || 'Investment Strategy',
          text: 'Check this out',
          url: window.location.href,
        });
      } catch (e) {
        /* user cancelled share — ignore */
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied!');
    }
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
        <div className="fixed top-4 right-4 z-50 p-4 bg-gray-900 text-white rounded-lg shadow-xl">
          {toastMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">{strategy.title}</h1>
          <p className="text-sm font-semibold text-gray-500 mb-4">{strategy.category || 'Uncategorized'}</p>
          <div className="flex items-center space-x-6 text-gray-400 text-sm">
            <span className="flex items-center"><span className="mr-1">👀</span> {views}</span>
            <span className="flex items-center"><span className="mr-1">❤️</span> {likes}</span>
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
            onClick={() => handleShare()}
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Gamification bar */}
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
