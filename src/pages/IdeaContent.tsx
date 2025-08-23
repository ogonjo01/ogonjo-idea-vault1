// src/pages/IdeaContent.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import IdeaReaderModalDebug from '@/components/IdeaReaderModalDebug';
import { Heart, Bookmark, Share2, Youtube, Book, MessageCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // adjust path if your project places useAuth elsewhere

// ----------------------
// Types
// ----------------------
type StructuredIdeaContent = any;

interface BusinessIdeaDetail {
  id: string;
  title: string;
  category?: string | null;
  short_description?: string | null;
  structured_idea_content?: StructuredIdeaContent | null;
  content_text?: string | null;
  thumbnail?: string | null;
  thumbnail_url?: string | null;
  difficulty?: string | null;
  market_size?: string | null;
  investment_needed?: string | null;
  timeline?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null; // DB column is `comments`
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// ----------------------
// Component
// ----------------------
const IdeaContent: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const initialIdea = state?.idea as BusinessIdeaDetail | undefined;
  const { user } = useAuth();

  // core state
  const [idea, setIdea] = useState<BusinessIdeaDetail | null>(initialIdea || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // derived counts
  const [views, setViews] = useState<number>(idea?.views ?? 0);
  const [likes, setLikes] = useState<number>(idea?.likes ?? 0);
  const [commentsCount, setCommentsCount] = useState<number>(idea?.comments ?? 0);

  const ideaId = initialIdea?.id || (state as any)?.id;

  // toast helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ----------------------
  // Fetch idea (without incrementing views) -- gets comments & counts
  // ----------------------
  const fetchIdea = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!ideaId) {
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
        .eq('id', ideaId)
        .maybeSingle();

      if (supabaseError) throw supabaseError;
      if (!data) {
        setError('Idea not found.');
        setIdea(null);
        setLoading(false);
        return;
      }

      // normalize comments
      const formattedComments: Comment[] = (data.idea_comments || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
      }));

      // update states
      setIdea({
        id: data.id,
        title: data.title,
        category: data.category ?? null,
        short_description: data.short_description ?? null,
        structured_idea_content: data.structured_idea_content ?? null,
        content_text: data.content_text ?? null,
        thumbnail: data.thumbnail ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        difficulty: data.difficulty ?? null,
        market_size: data.market_size ?? null,
        investment_needed: data.investment_needed ?? null,
        timeline: data.timeline ?? null,
        views: data.views ?? 0,
        likes: data.likes ?? 0,
        comments: data.comments ?? 0,
        youtube_link: data.youtube_link ?? null,
        full_book_link: data.full_book_link ?? null,
        affiliate_links: data.affiliate_links ?? null,
        created_at: data.created_at ?? null,
        updated_at: data.updated_at ?? null,
      });

      setComments(formattedComments);
      setViews(data.views ?? 0);
      setLikes(data.likes ?? 0);
      setCommentsCount(data.comments ?? 0);

      // check user like state
      if (user && ideaId) {
        const { data: likeData, error: likeErr } = await supabase
          .from('idea_likes')
          .select('id')
          .eq('idea_id', ideaId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (likeErr) {
          console.error('Error checking like status', likeErr);
          setIsLiked(false);
        } else {
          setIsLiked(!!likeData);
        }
      } else {
        setIsLiked(false);
      }
    } catch (err: any) {
      console.error('fetchIdea error:', err);
      setError('Failed to load idea.');
    } finally {
      setLoading(false);
    }
  }, [ideaId, user]);

  // ----------------------
  // Increment views ONCE (use RPC that returns the new count)
  // ----------------------
  useEffect(() => {
    if (!ideaId) return;
    let mounted = true;

    const incrementViews = async () => {
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('increment_business_idea_views', { idea_id_param: ideaId });

        if (rpcError) {
          console.error('View increment RPC error:', rpcError);
          // fallback: read the stored views without incrementing
          const { data: row, error: rowErr } = await supabase
            .from('business_ideas')
            .select('views')
            .eq('id', ideaId)
            .maybeSingle();
          if (!rowErr && mounted && row) setViews(row.views ?? 0);
        } else {
          // rpcData should be integer new views
          if (mounted) setViews((rpcData as unknown as number) ?? 0);
        }
      } catch (e) {
        console.error('increment views error:', e);
      }
    };

    incrementViews();
    return () => { mounted = false; };
  }, [ideaId]);

  // initial fetch (after we triggered the view increment)
  useEffect(() => {
    if (!ideaId) {
      navigate('/ideas');
      return;
    }
    fetchIdea();
  }, [ideaId, fetchIdea, navigate]);

  // ----------------------
  // Like toggle (optimistic) — relies on DB trigger to update business_ideas.likes
  // ----------------------
  const handleLikeToggle = useCallback(async () => {
    if (!user) {
      showToast('Please sign in to like ideas.');
      navigate('/auth?auth=true');
      return;
    }

    if (!ideaId) return;

    const willLike = !isLiked;
    // optimistic update
    setIsLiked(willLike);
    setLikes(prev => willLike ? prev + 1 : Math.max(prev - 1, 0));

    try {
      if (willLike) {
        const { error } = await supabase
          .from('idea_likes')
          .insert([{ idea_id: ideaId, user_id: user.id }])
          .select();
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('idea_likes')
          .delete()
          .match({ idea_id: ideaId, user_id: user.id });
        if (error) throw error;
      }

      // read authoritative likes value (trigger updates business_ideas.likes)
      const { data: refreshed, error: refErr } = await supabase
        .from('business_ideas')
        .select('likes')
        .eq('id', ideaId)
        .maybeSingle();

      if (!refErr && refreshed) setLikes(refreshed.likes ?? 0);
      showToast(willLike ? 'Liked!' : 'Unliked!');
    } catch (err: any) {
      console.error('like error:', err);
      // revert optimistic
      setIsLiked(prev => !prev);
      setLikes(prev => willLike ? Math.max(prev - 1, 0) : prev + 1);
      showToast('Failed to update like.');
    }
  }, [ideaId, isLiked, user, navigate]);

  // ----------------------
  // Save toggle (local only)
  // ----------------------
  const handleSaveToggle = useCallback(() => {
    setIsSaved(prev => !prev);
    showToast(isSaved ? 'Unsaved!' : 'Saved!');
  }, [isSaved]);

  // ----------------------
  // Add comment
  // ----------------------
  const handleAddComment = useCallback(async () => {
    if (!user) {
      showToast('Please sign in to comment.');
      navigate('/auth?auth=true');
      return;
    }

    if (!newComment.trim() || !ideaId) {
      showToast('Comment cannot be empty.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .insert([{ idea_id: ideaId, user_id: user.id, content: newComment.trim() }])
        .select('id, user_id, content, created_at')
        .single();

      if (error) throw error;

      // append locally and refresh authoritative comments count
      setComments(prev => [data as Comment, ...prev]);
      setNewComment('');

      const { data: refreshed, error: refErr } = await supabase
        .from('business_ideas')
        .select('comments')
        .eq('id', ideaId)
        .maybeSingle();

      if (!refErr && refreshed) setCommentsCount(refreshed.comments ?? (comments.length + 1));
      showToast('Comment posted!');
    } catch (err: any) {
      console.error('comment error:', err);
      showToast('Failed to post comment.');
    }
  }, [newComment, ideaId, user, navigate, comments.length]);

  // ----------------------
  // Links & helpers
  // ----------------------
  const openLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else showToast('No link available.');
  };

  const handleBuyGuide = () => showToast('Redirect to payment page for Full Startup Guideline!');
  const handleReadFullIdeaClick = () => {
    if (!idea?.id) {
      showToast('No idea to open.');
      return;
    }
    setIsModalOpen(true);
  };

  // ----------------------
  // Render
  // ----------------------
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
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-gray-900 text-white rounded-lg shadow-xl">
          {toastMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">{idea.title}</h1>
          <p className="text-sm font-semibold text-gray-500 mb-4">{idea.category ?? 'Uncategorized'}</p>
          <div className="flex items-center space-x-6 text-gray-400 text-sm">
            <span className="flex items-center"><span className="mr-1">👀</span> {views}</span>
            <span className="flex items-center"><span className="mr-1">❤️</span> {likes}</span>
            <span className="flex items-center"><span className="mr-1">💬</span> {commentsCount}</span>
          </div>
        </div>

        {/* Idea Details */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <p className="text-xl mb-4 font-light text-gray-700">{idea.short_description ?? ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {idea.difficulty && <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">Difficulty: {idea.difficulty}</span>}
            {idea.market_size && <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">Market Size: {idea.market_size}</span>}
            {idea.investment_needed && <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">Investment: {idea.investment_needed}</span>}
            {idea.timeline && <span className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full text-sm">Timeline: {idea.timeline}</span>}
          </div>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 p-4 bg-white rounded-3xl shadow-lg border border-gray-200">
          <button
            className={`flex items-center justify-center p-3 rounded-full transition-colors duration-200 ease-in-out ${isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-red-50'}`}
            onClick={handleLikeToggle}
          >
            <Heart className={`${isLiked ? 'fill-current' : ''}`} size={20} />
          </button>

          <button
            className={`flex items-center justify-center p-3 rounded-full transition-colors duration-200 ease-in-out ${isSaved ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50'}`}
            onClick={handleSaveToggle}
          >
            <Bookmark className={`${isSaved ? 'fill-current' : ''}`} size={20} />
          </button>

          <button
            className="flex items-center justify-center p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200"
            onClick={() => showToast('Share this idea!')}
          >
            <Share2 size={20} />
          </button>

          {idea.youtube_link && (
            <button className="flex items-center px-4 py-2 bg-red-500 text-white rounded-full" onClick={() => openLink(idea.youtube_link)}>
              <Youtube size={16} className="mr-2" /> YouTube
            </button>
          )}

          {idea.affiliate_links && idea.affiliate_links.length > 0 && (
            <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-full" onClick={() => openLink(idea.affiliate_links[0])}>
              <Book size={16} className="mr-2" /> Book
            </button>
          )}
        </div>

        {/* Gamification Bar */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200 flex flex-col sm:flex-row items-center justify-between text-gray-700">
          <span className="font-medium text-lg text-center sm:text-left mb-4 sm:mb-0">Progress: 50% - Unlock Full Idea!</span>
          <button className="w-full sm:w-auto px-6 py-3 bg-green-500 text-white font-bold rounded-full shadow-md hover:bg-green-600" onClick={handleReadFullIdeaClick}>Read Full Idea</button>
        </div>

        {/* Comments */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h3 className="text-2xl font-bold mb-4 flex items-center"><MessageCircle className="text-gray-500 mr-2" size={24} /> Comments ({comments.length})</h3>

          <div className="space-y-4 mb-6">
            {comments.length === 0 ? (
              <p className="text-gray-500 italic">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-gray-800 leading-relaxed">{comment.content}</p>
                  <small className="text-gray-400 mt-2 block">{new Date(comment.created_at).toLocaleDateString()}</small>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
            />
            <button className="px-6 py-3 bg-indigo-500 text-white font-semibold rounded-full self-end" onClick={handleAddComment}>Post Comment</button>
          </div>
        </div>

        {/* Buy Guideline */}
        <div className="bg-gray-800 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <ShoppingBag size={48} className="text-gray-300 mr-4" />
            <span className="text-xl font-bold">Unlock your full potential with the Complete Startup Guideline!</span>
          </div>
          <button className="w-full sm:w-auto px-6 py-3 bg-yellow-400 text-gray-900 font-bold rounded-full shadow-md hover:bg-yellow-500" onClick={handleBuyGuide}>Buy Now</button>
        </div>
      </div>

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
