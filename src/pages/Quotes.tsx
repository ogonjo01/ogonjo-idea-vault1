import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';
import { useAuth } from '@/services/supabase';
import QuoteDetailModal from '../components/QuoteDetailModal';
import QuoteCarousel from './QuoteCarousel';
import './Quotes.css';

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

const QUOTE_CATEGORIES = [
  { name: 'Leadership', description: 'Inspiring vision, leading teams, setting direction' },
  { name: 'Entrepreneurship & Risk', description: 'Courage, starting up, resilience' },
  { name: 'Innovation & Creativity', description: 'Thinking differently, disrupting the norm' },
  { name: 'Success & Motivation', description: 'Hard work, goals, perseverance' },
  { name: 'Failure & Learning', description: 'Growth mindset, learning from mistakes' },
  { name: 'Money & Finance', description: 'Wealth, investing, value creation' },
  { name: 'Strategy & Vision', description: 'Planning, foresight, competitive advantage' },
  { name: 'Marketing & Branding', description: 'Customer focus, storytelling, market fit' },
  { name: 'Productivity & Time Management', description: 'Efficiency, habits, execution' },
  { name: 'Teamwork & Culture', description: 'Collaboration, trust, workplace values' },
];

const truncate = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuoteForModal, setSelectedQuoteForModal] = useState<Quote | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const viewedQuoteIds = useRef(new Set<string>());

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('business_quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;

      const quotesWithLikeStatus: Quote[] = await Promise.all((data || []).map(async (quote: any) => {
        let isLikedByCurrentUser = false;
        if (user?.id) {
          const { data: likeData, error: likeError } = await supabase
            .from('user_quote_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('quote_id', quote.id);
          if (likeError && likeError.code !== 'PGRST116') console.error('Error checking like:', likeError.message);
          else isLikedByCurrentUser = likeData && likeData.length > 0;
        }
        return { ...quote, isLiked: isLikedByCurrentUser } as Quote;
      }));

      setAllQuotes(quotesWithLikeStatus);
    } catch (err: any) {
      console.error('Error fetching quotes:', err?.message ?? err);
      setError('Failed to load quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const handleLikeToggle = useCallback(async (quoteId: string, currentIsLiked: boolean) => {
    if (!user) {
      alert('Login Required. Please sign in to like quotes.');
      navigate('/auth');
      return;
    }

    try {
      if (currentIsLiked) {
        await supabase.from('user_quote_likes').delete().eq('quote_id', quoteId).eq('user_id', user.id);
        await supabase.rpc('decrement_quote_likes', { quote_id_param: quoteId });
        setAllQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, likes: Math.max(0, q.likes - 1), isLiked: false } : q));
        setSelectedQuoteForModal(prev => prev?.id === quoteId ? { ...prev, likes: Math.max(0, prev.likes - 1), isLiked: false } : prev);
      } else {
        await supabase.from('user_quote_likes').insert({ quote_id: quoteId, user_id: user.id });
        await supabase.rpc('increment_quote_likes', { quote_id_param: quoteId });
        setAllQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, likes: (q.likes || 0) + 1, isLiked: true } : q));
        setSelectedQuoteForModal(prev => prev?.id === quoteId ? { ...prev, likes: (prev.likes || 0) + 1, isLiked: true } : prev);
      }
    } catch (err: any) {
      alert(`Failed to toggle like: ${err?.message ?? err}`);
      console.error('Error toggling like:', err?.message ?? err);
    }
  }, [user, navigate]);

  const handleQuoteView = useCallback(async (quoteId: string) => {
    if (!viewedQuoteIds.current.has(quoteId)) {
      viewedQuoteIds.current.add(quoteId);
      try {
        await supabase.rpc('increment_quote_views', { quote_id_param: quoteId });
        setAllQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, views: (q.views || 0) + 1 } : q));
        setSelectedQuoteForModal(prev => prev?.id === quoteId ? { ...prev, views: (prev.views || 0) + 1 } : prev);
      } catch (err: any) {
        console.error('Error incrementing view:', err?.message ?? err);
      }
    }
  }, []);

  const handleShareQuote = useCallback((quote: Quote) => {
    const message = `"${quote.quote_text}" - ${quote.author}${quote.category ? ` (#${quote.category.replace(/\s/g, '')})` : ''}\n\nShared from OGONJO Web!`;
    navigator.clipboard.writeText(message).then(() => {
      alert('Quote copied to clipboard!');
    }).catch((err) => {
      alert(`Failed to share: ${err?.message ?? err}`);
      console.error('Error sharing quote:', err?.message ?? err);
    });
  }, []);

  const openQuoteModal = useCallback((quote: Quote) => {
    setSelectedQuoteForModal(quote);
    setIsModalVisible(true);
    handleQuoteView(quote.id);
  }, [handleQuoteView]);

  const closeQuoteModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedQuoteForModal(null);
  }, []);

  // >>> NEW: reusable card renderer that matches Dashboard style
  const renderQuoteCard = (quote: Quote) => (
    <div
      className="horizontal-item"
      key={quote.id}
      role="listitem"
      aria-label={`Quote by ${quote.author}`}
    >
      <div
        className="quote-card"
        onClick={() => openQuoteModal(quote)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') openQuoteModal(quote); }}
      >
        <div className="quote-card-body">
          <p className="quote-text-brief">"{truncate(quote.quote_text, 160)}"</p>
          <p className="quote-author">— {quote.author}</p>
          {quote.category && <span className="quote-pill">{quote.category}</span>}
        </div>

        <div className="quote-card-footer">
          <div className="quote-stats-row">
            <span className="stat"><span className="stat-emoji">❤️</span> {quote.likes || 0}</span>
            <span className="stat"><span className="stat-emoji">👁️</span> {quote.views || 0}</span>
          </div>

          <div className="quote-ctas">
            <button
              className="btn-view"
              onClick={(e) => {
                e.stopPropagation();
                openQuoteModal(quote);
              }}
              aria-label={`View quote by ${quote.author}`}
            >
              View
            </button>

            <button
              className="btn-share"
              onClick={(e) => { e.stopPropagation(); handleShareQuote(quote); }}
              aria-label="Share quote"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuoteSection = (title: string, quotesToDisplay: Quote[], filterType: 'mostLiked' | 'mostViewed' | 'category' | 'latest', categoryName?: string) => {
    if (!quotesToDisplay.length) return null;
    return (
      <section className="section-container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          <button
            className="see-all-button"
            onClick={() => navigate('/quote-list', { state: { title: `All ${title}`, filterType, categoryName } })}
          >
            See All <i className="ion-arrow-forward" />
          </button>
        </div>

        <div className="horizontal-list" role="list" aria-label={`${title} quotes`}>
          {quotesToDisplay.map((q) => renderQuoteCard(q))}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Loading quotes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchQuotes}>Retry</button>
      </div>
    );
  }

  const latestQuotes = [...allQuotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12);
  const mostLikedQuotes = [...allQuotes].sort((a, b) => b.likes - a.likes).slice(0, 12);
  const mostViewedQuotes = [...allQuotes].sort((a, b) => b.views - a.views).slice(0, 12);

  return (
    <div className="quotes-container">
      <div className="carousel-wrapper" style={{ zIndex: 5 }}>
        <QuoteCarousel
  quotes={latestQuotes}
  onViewQuote={openQuoteModal} // 🔹 pass the modal handler
/>
      </div>

      <div className="content-wrapper" style={{ zIndex: 10, position: 'relative' }}>
        <header className="header">
          <h1 className="header-title">Business Wise Quotes</h1>
          <button className="profile-button" onClick={() => navigate('/user-profile')}>Profile</button>
        </header>

        <AdBanner adUnitId="quotes_top_banner" advertiserName="Mindset Boosters" callToAction="Get Inspired" />

        <div className="browse-by-category-container">
          <h2 className="browse-by-category-title">Browse by Category</h2>

          {/* horizontal scrollable category row */}
          <div className="category-browse-scroll-view" role="tablist" aria-label="Browse categories">
            <button
              className="browse-category-button"
              onClick={() => navigate('/quote-list', { state: { title: `All Quotes`, filterType: 'latest' } })}
              aria-label="All categories"
              style={{ flex: '0 0 auto' }}
            >
              All
            </button>

            {QUOTE_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                className="browse-category-button"
                onClick={() => navigate('/quote-list', { state: { title: `${cat.name} Quotes`, filterType: 'category', categoryName: cat.name } })}
                style={{ flex: '0 0 auto' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {renderQuoteSection('Latest Quotes', latestQuotes, 'latest')}
        <AdBanner adUnitId="quotes_mid_banner" advertiserName="Success Coaching" callToAction="Learn More" />
        {renderQuoteSection('Most Liked Quotes', mostLikedQuotes, 'mostLiked')}
        {renderQuoteSection('Most Viewed Quotes', mostViewedQuotes, 'mostViewed')}

        {QUOTE_CATEGORIES.map((cat) => {
          const categorizedQuotes = allQuotes.filter(q => q.category === cat.name)
            .sort((a, b) => b.likes - a.likes).slice(0, 10);
          return (categorizedQuotes.length > 0) ? renderQuoteSection(`Most Popular in ${cat.name}`, categorizedQuotes, 'category', cat.name) : null;
        })}

        <button className="explore-more-button" onClick={() => navigate('/quote-list', { state: { title: 'All Quotes', filterType: 'latest' } })}>
          <span>Explore All Quotes</span>
        </button>

        <AdBanner adUnitId="quotes_bottom_banner" advertiserName="Productivity Tools" callToAction="Boost Your Day" />

        {selectedQuoteForModal && (
          <QuoteDetailModal
            isVisible={isModalVisible}
            onClose={closeQuoteModal}
            initialQuote={selectedQuoteForModal}
            allQuotes={allQuotes}
            onLikeToggle={handleLikeToggle}
            onShare={handleShareQuote}
            onViewed={handleQuoteView}
          />
        )}
      </div>
    </div>
  );
};

export default Quotes;
