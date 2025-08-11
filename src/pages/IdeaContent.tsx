import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import IdeaReaderModalDebug from './../components/IdeaReaderModalDebug';
import { Heart, Bookmark, Share2, Youtube, Book, MessageCircle, ShoppingBag } from 'lucide-react'; // Using lucide-react for icons

// Removed './IdeaContent.css' - all styling is now handled by Tailwind CSS

type StructuredIdeaContent = any;

interface BusinessIdeaDetail {
  id: string;
  title: string;
  category: string | null;
  short_description: string | null;
  structured_idea_content: StructuredIdeaContent | null;
  content_text?: string | null;
  thumbnail?: string | null;
  thumbnail_url?: string | null;
  difficulty?: string | null;
  market_size?: string | null;
  investment_needed?: string | null;
  timeline?: string | null;
  views?: number | null;
  likes?: number | null;
  comments_count?: number | null;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const IdeaContent: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const initialIdea = state?.idea as BusinessIdeaDetail | undefined;

  const [idea, setIdea] = useState<BusinessIdeaDetail | null>(initialIdea || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simple toast message display helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000); // Hide toast after 3 seconds
  };

  const fetchIdeaAndComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const id = initialIdea?.id || (state as any)?.id;
    if (!id) {
      setError('No idea ID provided.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('business_ideas')
        .select(`
          *,
          idea_comments(id, user_id, content, created_at)
        `)
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        const formattedComments = (data.idea_comments || []).map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
        })) as Comment[];

        let structured = data.structured_idea_content ?? null;
        if (structured && typeof structured === 'string') {
          try {
            structured = JSON.parse(structured);
          } catch (e) {
            console.warn('Failed to parse structured_idea_content JSON:', e);
          }
        }

        let contentHtml: string | null = null;
        if (data.content_text && String(data.content_text).trim().length > 0) {
          contentHtml = String(data.content_text);
        } else if (structured) {
          let steps: any[] = [];
          if (Array.isArray(structured)) {
            steps = structured;
          } else if (structured.steps && Array.isArray(structured.steps)) {
            steps = structured.steps;
          }

          if (steps.length > 0) {
            contentHtml = steps
              .map((s: any, idx: number) => {
                const action = s.action ?? s.description ?? '';
                return `<section data-step="${idx + 1}" style="margin-bottom:18px;">
                          ${action}
                        </section>`;
              })
              .join('\n');
          } else if ((structured as any).overview) {
            const ov = (structured as any).overview;
            contentHtml = `<h3>Overview</h3>
                           <p><strong>Problem:</strong> ${ov.problem ?? ''}</p>
                           <p><strong>Solution:</strong> ${ov.solution ?? ''}</p>
                           <p><strong>Target Audience:</strong> ${ov.target_audience ?? ''}</p>
                           <p><strong>USP:</strong> ${ov.unique_selling_proposition ?? ''}</p>`;
          }
        }

        const normalized: BusinessIdeaDetail = {
          id: data.id,
          title: data.title,
          category: data.category ?? null,
          short_description: data.short_description ?? null,
          structured_idea_content: structured ?? null,
          content_text: contentHtml ?? data.content_text ?? null,
          thumbnail: data.thumbnail ?? null,
          thumbnail_url: data.thumbnail_url ?? null,
          difficulty: data.difficulty ?? null,
          market_size: data.market_size ?? null,
          investment_needed: data.investment_needed ?? null,
          timeline: data.timeline ?? null,
          views: data.views ?? 0,
          likes: data.likes ?? 0,
          comments_count: data.comments ?? 0,
          youtube_link: data.youtube_link ?? null,
          full_book_link: data.full_book_link ?? null,
          affiliate_links: data.affiliate_links ?? null,
        };

        setComments(formattedComments);
        setIdea(normalized);
      } else {
        setError('Idea not found.');
      }
    } catch (err: any) {
      console.error('fetchIdeaAndComments error:', err);
      setError('Failed to load idea details.');
    } finally {
      setLoading(false);
    }
  }, [initialIdea?.id, state]);

  useEffect(() => {
    if (!initialIdea?.id && !(state as any)?.id) {
      navigate('/ideas');
      return;
    }
    fetchIdeaAndComments();
  }, [initialIdea?.id, navigate, state, fetchIdeaAndComments]);

  const handleLikeToggle = useCallback(async () => {
    setIsLiked((prev) => !prev);
    showToast(isLiked ? 'Unliked!' : 'Liked!');
  }, [isLiked]);

  const handleSaveToggle = useCallback(async () => {
    setIsSaved((prev) => !prev);
    showToast(isSaved ? 'Unsaved!' : 'Saved!');
  }, [isSaved]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) {
      showToast('Comment cannot be empty.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .insert({ idea_id: idea?.id, content: newComment.trim() })
        .select('id, user_id, content, created_at')
        .single();
      if (error) throw error;
      if (data) setComments((prev) => [data as Comment, ...prev]);
      setNewComment('');
      showToast('Comment posted!');
    } catch (err: any) {
      showToast(`Failed to add comment: ${err.message}`);
    }
  }, [idea?.id, newComment]);

  const openLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else showToast('No link available.');
  };

  const handleBuyGuide = () => {
    showToast('Redirect to payment page for Full Startup Guideline!');
  };

  const handleReadFullIdeaClick = () => {
    console.log('Read Full Idea clicked. idea id:', idea?.id);
    if (!idea?.id) {
      console.warn('No idea available to open in modal');
      return;
    }
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-500 text-lg p-6 rounded-lg bg-white shadow-md">
          {error || 'Idea not found.'}
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
        {/* Idea Header */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">{idea.title}</h1>
          <p className="text-sm font-semibold text-gray-500 mb-4">{idea.category ?? 'Uncategorized'}</p>
          <div className="flex items-center space-x-6 text-gray-400 text-sm">
            <span className="flex items-center">
              <span className="mr-1">👀</span> {idea.views ?? 0}
            </span>
            <span className="flex items-center">
              <span className="mr-1">❤️</span> {idea.likes ?? 0}
            </span>
            <span className="flex items-center">
              <span className="mr-1">💬</span> {idea.comments_count ?? 0}
            </span>
          </div>
        </div>

        {/* Idea Details */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <p className="text-xl mb-4 font-light text-gray-700">{idea.short_description ?? ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {idea.difficulty && (
              <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">
                Difficulty: {idea.difficulty}
              </span>
            )}
            {idea.market_size && (
              <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">
                Market Size: {idea.market_size}
              </span>
            )}
            {idea.investment_needed && (
              <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">
                Investment: {idea.investment_needed}
              </span>
            )}
            {idea.timeline && (
              <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">
                Timeline: {idea.timeline}
              </span>
            )}
          </div>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 p-4 bg-white rounded-3xl shadow-lg border border-gray-200">
          <button
            className={`flex items-center justify-center p-3 rounded-full transition-colors duration-200 ease-in-out ${
              isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-red-50'
            }`}
            onClick={handleLikeToggle}
          >
            <Heart className={`${isLiked ? 'fill-current' : ''}`} size={20} />
          </button>
          <button
            className={`flex items-center justify-center p-3 rounded-full transition-colors duration-200 ease-in-out ${
              isSaved ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50'
            }`}
            onClick={handleSaveToggle}
          >
            <Bookmark className={`${isSaved ? 'fill-current' : ''}`} size={20} />
          </button>
          <button
            className="flex items-center justify-center p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors duration-200 ease-in-out"
            onClick={() => showToast('Share this idea!')}
          >
            <Share2 size={20} />
          </button>

          {idea.youtube_link && (
            <button
              className="flex items-center px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200 ease-in-out font-medium text-sm"
              onClick={() => openLink(idea.youtube_link)}
            >
              <Youtube size={16} className="mr-2" /> YouTube
            </button>
          )}

          {idea.affiliate_links && idea.affiliate_links.length > 0 && (
            <button
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-200 ease-in-out font-medium text-sm"
              onClick={() => openLink(idea.affiliate_links![0])}
            >
              <Book size={16} className="mr-2" /> Book
            </button>
          )}
        </div>

        {/* Gamification Bar */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200 flex flex-col sm:flex-row items-center justify-between text-gray-700">
          <span className="font-medium text-lg text-center sm:text-left mb-4 sm:mb-0">
            Progress: 50% - Unlock Full Idea!
          </span>
          <button
            className="w-full sm:w-auto px-6 py-3 bg-green-500 text-white font-bold rounded-full shadow-md hover:bg-green-600 transition-colors duration-200 ease-in-out transform hover:scale-105"
            onClick={handleReadFullIdeaClick}
          >
            Read Full Idea
          </button>
        </div>

        {/* Comments Section */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
            <MessageCircle className="text-gray-500 mr-2" size={24} /> Comments ({comments.length})
          </h3>
          <div className="space-y-4 mb-6">
            {comments.length === 0 ? (
              <p className="text-gray-500 italic">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-gray-800 leading-relaxed">{comment.content}</p>
                  <small className="text-gray-400 mt-2 block">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </small>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-col space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition-colors duration-200"
            />
            <button
              className="px-6 py-3 bg-indigo-500 text-white font-semibold rounded-full shadow-md hover:bg-indigo-600 transition-colors duration-200 ease-in-out self-end"
              onClick={handleAddComment}
            >
              Post Comment
            </button>
          </div>
        </div>

        {/* Buy Guideline Section */}
        <div className="bg-gray-800 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <ShoppingBag size={48} className="text-gray-300 mr-4" />
            <span className="text-xl font-bold">
              Unlock your full potential with the Complete Startup Guideline!
            </span>
          </div>
          <button
            className="w-full sm:w-auto px-6 py-3 bg-yellow-400 text-gray-900 font-bold rounded-full shadow-md hover:bg-yellow-500 transition-colors duration-200 ease-in-out transform hover:scale-105"
            onClick={handleBuyGuide}
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Idea Reader Modal - Not modified */}
      <IdeaReaderModalDebug
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ideaTitle={idea.title}
        contentHtml={idea.content_text ?? null}
        shortDescription={idea.short_description ?? null}
        structuredIdea={idea.structured_idea_content ?? null}
        rewriteStoragePaths={true}
        thumbnailUrl={idea.thumbnail_url ?? idea.thumbnail ?? null}
      />
    </div>
  );
};

export default IdeaContent;
