import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import BookSummaryReaderModal from '@/components/BookSummaryReaderModal';
import { Heart, Bookmark, Share2 } from 'lucide-react';

interface RichSummaryContent {
  overview: string;
  [key: string]: any;
}

function BookSummaryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullStructuredContent, setFullStructuredContent] = useState<RichSummaryContent | null>(null);
  const [displayShortDescription, setDisplayShortDescription] = useState<string | null>(null);
  const [summaryTitle, setSummaryTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchSummaryDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('book_summaries')
        .select(`
          title,
          author,
          summary_content,
          short_description,
          likes,
          views
        `)
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        setSummaryTitle(data.title || 'Untitled');
        setBookAuthor(data.author || 'Unknown Author');
        setLikes(data.likes || 0);
        setViews(data.views || 0);

        let parsedContent: RichSummaryContent | null = null;
        if (typeof data.summary_content === 'string') {
          try {
            parsedContent = JSON.parse(data.summary_content);
          } catch {
            parsedContent = null;
          }
        } else if (typeof data.summary_content === 'object') {
          parsedContent = data.summary_content;
        }
        setFullStructuredContent(parsedContent);

        if (data.short_description) {
          setDisplayShortDescription(data.short_description);
        } else if (parsedContent?.overview) {
          const plainText = parsedContent.overview.replace(/<[^>]+>/g, '');
          setDisplayShortDescription(plainText.slice(0, 300) + '...');
        }

        if (data.summary_content) {
          await supabase.rpc('increment_views', { summary_id: id });
          setViews((prev) => prev + 1);
        }

        if (user) {
          const { data: likeData } = await supabase
            .from('user_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('summary_id', id)
            .single();
          setIsLiked(!!likeData);
        }
      } else {
        setError('Summary not found.');
      }
    } catch (err: any) {
      setError(`Failed to load summary details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchSummaryDetails();
  }, [fetchSummaryDetails]);

  const handleLikePress = async () => {
    if (!user) {
      showToast('Please log in to like this summary.');
      navigate('/auth?auth=true');
      return;
    }

    try {
      if (isLiked) {
        await supabase.from('user_likes').delete().eq('user_id', user.id).eq('summary_id', id);
        await supabase.rpc('decrement_likes', { summary_id: id });
        setLikes((l) => Math.max(0, l - 1));
        setIsLiked(false);
      } else {
        await supabase.from('user_likes').insert({ user_id: user.id, summary_id: id });
        await supabase.rpc('increment_likes', { summary_id: id });
        setLikes((l) => l + 1);
        setIsLiked(true);
      }
      showToast(isLiked ? 'Unliked!' : 'Liked!');
    } catch {
      showToast('Failed to update like status. Please try again.');
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      showToast('Please log in to save this summary.');
      navigate('/auth?auth=true');
      return;
    }
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

  if (error || !displayShortDescription) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-500 text-lg p-6 rounded-lg bg-white shadow-md">
          {error || 'Summary content unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen p-4 sm:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-gray-900 text-white rounded-lg shadow-xl animate-fade-in-out">
          {toastMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">{summaryTitle}</h1>
          <p className="text-sm font-semibold text-gray-500 mb-4">by {bookAuthor}</p>
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
          <p className="text-gray-700 leading-relaxed">{displayShortDescription}</p>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 p-4 bg-white rounded-3xl shadow-lg border border-gray-200">
          <button
            className={`flex items-center justify-center p-3 rounded-full transition-colors duration-200 ease-in-out ${
              isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-red-50'
            }`}
            onClick={(e) => { e.stopPropagation(); handleLikePress(); }}
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
            onClick={() => showToast('Share this summary!')}
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Gamification Bar */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200 flex flex-col sm:flex-row items-center justify-between text-gray-700">
          <span className="font-medium text-lg text-center sm:text-left mb-4 sm:mb-0">
            Progress: 50% - Unlock Full Summary!
          </span>
          <button
            className="w-full sm:w-auto px-6 py-3 bg-green-500 text-white font-bold rounded-full shadow-md hover:bg-green-600 transition-colors duration-200 ease-in-out transform hover:scale-105"
            onClick={() => setIsReaderModalOpen(true)}
          >
            Read More
          </button>
        </div>
      </div>

      {/* Modal for Full Summary */}
      {fullStructuredContent && (
        <BookSummaryReaderModal
          isOpen={isReaderModalOpen}
          onClose={() => setIsReaderModalOpen(false)}
          summaryTitle={summaryTitle}
          bookAuthor={bookAuthor}
          fullHtmlContent={fullStructuredContent.overview || '<p>No content available.</p>'}
        />
      )}
    </div>
  );
}

export default BookSummaryDetail;