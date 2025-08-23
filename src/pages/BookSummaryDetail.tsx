// src/pages/BookSummaryDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase'; // keep your existing client/hook
import BookSummaryReaderModal from '@/components/BookSummaryReaderModal';
import { Heart, Bookmark, Share2 } from 'lucide-react';

interface RichSummaryContent {
  overview?: string;
  [k: string]: any;
}

export default function BookSummaryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // UI state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [shortDesc, setShortDesc] = useState<string | null>(null);
  const [structured, setStructured] = useState<RichSummaryContent | null>(null);
  const [likes, setLikes] = useState<number>(0);
  const [views, setViews] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToastMessage(m);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchSummary = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('book_summaries')
        .select('title, author, summary_content, short_description, likes, views')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Summary not found');
        setLoading(false);
        return;
      }

      setTitle(data.title ?? '');
      setAuthor(data.author ?? '');
      setLikes(data.likes ?? 0);
      setViews(data.views ?? 0);

      // parse structured content if present
      let parsed = null;
      if (data.summary_content) {
        if (typeof data.summary_content === 'string') {
          try { parsed = JSON.parse(data.summary_content); } catch { parsed = null; }
        } else parsed = data.summary_content;
      }
      setStructured(parsed);

      if (data.short_description) setShortDesc(data.short_description);
      else if (parsed?.overview) {
        const plain = String(parsed.overview).replace(/<[^>]+>/g, '');
        setShortDesc(plain.slice(0, 300) + (plain.length > 300 ? '...' : ''));
      } else setShortDesc(null);

      // check if current user liked
      if (user) {
        const { data: likeRow, error: likeErr } = await supabase
          .from('user_book_summary_likes')
          .select('id')
          .eq('book_summary_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!likeErr) setIsLiked(!!likeRow);
      } else setIsLiked(false);
    } catch (err: any) {
      console.error('fetchSummary error', err);
      setError(err?.message ?? 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  // increment views once using RPC and set returned value
  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const inc = async () => {
      try {
        const { data: rpcData, error: rpcErr } = await supabase
          .rpc('increment_book_summary_views', { summary_id_param: id });

        if (rpcErr) {
          console.error('views rpc error', rpcErr);
          // fallback: read DB value (no increment)
          const { data: row } = await supabase.from('book_summaries').select('views').eq('id', id).maybeSingle();
          if (mounted && row) setViews(row.views ?? 0);
        } else {
          if (mounted) setViews((rpcData as unknown as number) ?? 0);
        }
      } catch (e) {
        console.error('increment views error', e);
      }
    };

    inc();
    return () => { mounted = false; };
  }, [id]);

  // initial fetch (after increment)
  useEffect(() => {
    if (!id) {
      navigate('/summaries');
      return;
    }
    fetchSummary();
  }, [id, fetchSummary, navigate]);

  // Like toggle: insert/delete user_book_summary_likes and refresh authoritative likes
  const handleLikePress = async () => {
    if (!user) {
      showToast('Please log in to like this summary.');
      navigate('/auth?auth=true');
      return;
    }
    if (!id) return;

    const willLike = !isLiked;
    // optimistic UI
    setIsLiked(willLike);
    setLikes(prev => willLike ? prev + 1 : Math.max(prev - 1, 0));

    try {
      if (willLike) {
        const { error } = await supabase
          .from('user_book_summary_likes')
          .insert([{ user_id: user.id, book_summary_id: id }])
          .select();
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_book_summary_likes')
          .delete()
          .match({ user_id: user.id, book_summary_id: id });
        if (error) throw error;
      }

      // read authoritative likes value (trigger updates book_summaries.likes)
      const { data: refreshed, error: refErr } = await supabase
        .from('book_summaries')
        .select('likes')
        .eq('id', id)
        .maybeSingle();

      if (!refErr && refreshed) setLikes(refreshed.likes ?? 0);
      showToast(willLike ? 'Liked!' : 'Unliked!');
    } catch (err: any) {
      console.error('like action failed', err);
      // revert optimistic
      setIsLiked(prev => !prev);
      setLikes(prev => willLike ? Math.max(prev - 1, 0) : prev + 1);
      showToast('Failed to update like.');
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      showToast('Please log in.');
      navigate('/auth?auth=true');
      return;
    }
    setIsSaved(s => !s);
    showToast(isSaved ? 'Unsaved!' : 'Saved!');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="text-gray-600 text-lg">Loading...</div></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="text-red-500 text-lg p-6 rounded-lg bg-white shadow-md">{error}</div></div>;
  }

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen p-4 sm:p-8">
      {toastMessage && <div className="fixed top-4 right-4 z-50 p-4 bg-gray-900 text-white rounded-lg shadow-xl">{toastMessage}</div>}

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm font-semibold text-gray-500 mb-4">by {author}</p>
          <div className="flex items-center space-x-6 text-gray-400 text-sm">
            <span className="flex items-center"><span className="mr-1">👀</span> {views}</span>
            <span className="flex items-center"><span className="mr-1">❤️</span> {likes}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed">{shortDesc ?? 'No description available.'}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 p-4 bg-white rounded-3xl shadow-lg border border-gray-200">
          <button className={`flex items-center justify-center p-3 rounded-full ${isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-red-50'}`} onClick={handleLikePress}>
            <Heart className={`${isLiked ? 'fill-current' : ''}`} size={20} />
          </button>

          <button className={`flex items-center justify-center p-3 rounded-full ${isSaved ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50'}`} onClick={handleSaveToggle}>
            <Bookmark className={`${isSaved ? 'fill-current' : ''}`} size={20} />
          </button>

          <button className="flex items-center justify-center p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200" onClick={() => showToast('Share this summary!')}>
            <Share2 size={20} />
          </button>

          <button className="px-4 py-2 bg-green-500 text-white rounded-full" onClick={() => setIsReaderOpen(true)}>Read More</button>
        </div>
      </div>

      {structured && (
        <BookSummaryReaderModal
          isOpen={isReaderOpen}
          onClose={() => setIsReaderOpen(false)}
          summaryTitle={title}
          bookAuthor={author}
          fullHtmlContent={structured.overview ?? '<p>No content</p>'}
        />
      )}
    </div>
  );
}
