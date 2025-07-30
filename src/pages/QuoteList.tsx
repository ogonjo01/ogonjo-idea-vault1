// src/pages/QuoteList.tsx
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import QuoteDetailModal from '@/components/QuoteDetailModal';
import './QuoteList.css';

interface Quote {
  id: string;
  quote_text: string;
  author: string;
  category?: string;
  created_at: string;
  likes: number;
  views: number;
  isLiked?: boolean;
}

function QuoteList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const params = new URLSearchParams(location.search);
  const title = params.get('title') || 'Quotes';
  const filterType = params.get('filterType') as 'mostLiked' | 'mostViewed' | 'category' | 'latest' || 'latest';
  const categoryName = params.get('categoryName') || '';

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuoteForModal, setSelectedQuoteForModal] = useState<Quote | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [allQuotesForModal, setAllQuotesForModal] = useState<Quote[]>([]);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('business_quotes').select('*');

      if (filterType === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else if (filterType === 'mostLiked') {
        query = query.order('likes', { ascending: false }).order('created_at', { ascending: false });
      } else if (filterType === 'mostViewed') {
        query = query.order('views', { ascending: false }).order('created_at', { ascending: false });
      } else if (filterType === 'category' && categoryName) {
        query = query.eq('category', categoryName).order('created_at', { ascending: false });
      }

      query = query.limit(100);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const quotesWithLikeStatus: Quote[] = await Promise.all(
        (data || []).map(async (quote) => {
          let isLikedByCurrentUser = false;
          if (user) {
            const { data: likeData, error: likeError } = await supabase
              .from('user_quote_likes')
              .select('id')
              .eq('user_id', user.id)
              .eq('quote_id', quote.id);

            if (likeError && likeError.code !== 'PGRST116') {
              console.error('Error checking user quote like:', likeError.message);
            } else {
              isLikedByCurrentUser = likeData && likeData.length > 0;
            }
          }
          return { ...quote, isLiked: isLikedByCurrentUser };
        })
      );

      setQuotes(quotesWithLikeStatus);
      setAllQuotesForModal(quotesWithLikeStatus);
    } catch (err: any) {
      setError('Failed to load quotes. Please try again.');
      console.error('Error fetching quotes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, categoryName, user]);

  useEffect(() => {
    if (!authLoading) {
      fetchQuotes();
    }
  }, [authLoading, fetchQuotes]);

  const handleLikeToggle = useCallback(
    async (quoteId: string, currentIsLiked: boolean) => {
      if (!user) {
        alert('Please sign in to like quotes.');
        navigate('/auth');
        return;
      }

      try {
        if (currentIsLiked) {
          const { error: deleteError } = await supabase
            .from('user_quote_likes')
            .delete()
            .eq('quote_id', quoteId)
            .eq('user_id', user.id);

          if (deleteError) throw deleteError;
          await supabase.rpc('decrement_quote_likes', { quote_id_param: quoteId });
          setQuotes((prev) =>
            prev.map((q) => (q.id === quoteId ? { ...q, likes: Math.max(0, q.likes - 1), isLiked: false } : q))
          );
          setAllQuotesForModal((prev) =>
            prev.map((q) => (q.id === quoteId ? { ...q, likes: Math.max(0, q.likes - 1), isLiked: false } : q))
          );
          setSelectedQuoteForModal((prev) =>
            prev && prev.id === quoteId ? { ...prev, likes: Math.max(0, prev.likes - 1), isLiked: false } : prev
          );
        } else {
          const { error: insertError } = await supabase
            .from('user_quote_likes')
            .insert({ quote_id: quoteId, user_id: user.id });

          if (insertError) throw insertError;
          await supabase.rpc('increment_quote_likes', { quote_id_param: quoteId });
          setQuotes((prev) =>
            prev.map((q) => (q.id === quoteId ? { ...q, likes: (q.likes || 0) + 1, isLiked: true } : q))
          );
          setAllQuotesForModal((prev) =>
            prev.map((q) => (q.id === quoteId ? { ...q, likes: (q.likes || 0) + 1, isLiked: true } : q))
          );
          setSelectedQuoteForModal((prev) =>
            prev && prev.id === quoteId ? { ...prev, likes: (prev.likes || 0) + 1, isLiked: true } : prev
          );
        }
      } catch (err: any) {
        alert(`Failed to toggle like: ${err.message}`);
        console.error('Error toggling like:', err.message);
      }
    },
    [user, navigate]
  );

  const handleQuoteView = useCallback(async (quoteId: string) => {
    try {
      await supabase.rpc('increment_quote_views', { quote_id_param: quoteId });
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, views: (q.views || 0) + 1 } : q)));
      setAllQuotesForModal((prev) => prev.map((q) => (q.id === quoteId ? { ...q, views: (q.views || 0) + 1 } : q)));
      setSelectedQuoteForModal((prev) =>
        prev && prev.id === quoteId ? { ...prev, views: (prev.views || 0) + 1 } : prev
      );
    } catch (err: any) {
      console.error('Error incrementing quote view:', err.message);
    }
  }, []);

  const handleShareQuote = useCallback(async (quote: Quote) => {
    try {
      const message = `"${quote.quote_text}" - ${quote.author}${quote.category ? ` (#${quote.category.replace(/\s/g, '')})` : ''}\n\nShared from OGONJO App!`;
      if (navigator.share) {
        await navigator.share({
          title: 'Inspirational Business Quote',
          text: message,
        });
      } else {
        alert('Sharing is not supported in this browser.');
      }
    } catch (error: any) {
      alert('Could not share the quote.');
      console.error('Error sharing quote:', error.message);
    }
  }, []);

  const openQuoteModal = useCallback((quote: Quote) => {
    setSelectedQuoteForModal(quote);
    setIsModalVisible(true);
  }, []);

  const closeQuoteModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedQuoteForModal(null);
  }, []);

  if (loading) {
    return (
      <div className="page-container loading-container">
        <div className="spinner"></div>
        <p>Loading quotes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchQuotes}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>{title}</h1>
      {quotes.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">No quotes found for this selection.</p>
          <p className="empty-state-sub-text">Try uploading a new quote!</p>
        </div>
      ) : (
        quotes.map((quote) => (
          <div key={quote.id} className="quote-card" onClick={() => openQuoteModal(quote)}>
            <p className="quote-text">"{quote.quote_text}"</p>
            <p className="quote-author">- {quote.author}</p>
            {quote.category && <p className="quote-category">Category: {quote.category}</p>}
            <div className="quote-actions">
              <button
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLikeToggle(quote.id, quote.isLiked || false);
                }}
              >
                <span className="material-icons">{quote.isLiked ? 'favorite' : 'favorite_border'}</span>
                {quote.likes || 0}
              </button>
              <div className="action-button">
                <span className="material-icons">visibility</span>
                {quote.views || 0}
              </div>
              <button
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareQuote(quote);
                }}
              >
                <span className="material-icons">share</span>
                Share
              </button>
            </div>
          </div>
        ))
      )}
      {selectedQuoteForModal && (
        <QuoteDetailModal
          isOpen={isModalVisible}
          onClose={closeQuoteModal}
          initialQuote={selectedQuoteForModal}
          allQuotes={allQuotesForModal}
          onLikeToggle={handleLikeToggle}
          onShare={handleShareQuote}
          onViewed={handleQuoteView}
        />
      )}
    </div>
  );
}

export default QuoteList;