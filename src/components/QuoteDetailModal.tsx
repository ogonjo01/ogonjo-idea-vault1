// src/components/QuoteDetailModal.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Theme } from '../constants/Theme';
import { supabase, useAuth } from '../services/supabase';
import '../styles/QuoteDetailModal.css';

interface Quote {
  id: string;
  quote_text: string;
  author: string;
  category?: string;
  created_at: string;
  likes: number;
  views: number;
  isLiked?: boolean;
  book_title?: string | null;
  affiliate_link?: string | null;
  affiliate_clicks?: number;
}

interface QuoteDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialQuote: Quote;
  allQuotes: Quote[];
  onLikeToggle: (quoteId: string, currentIsLiked: boolean) => void;
  onShare: (quote: Quote) => void;
  onViewed: (quoteId: string) => void;
}

const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  isVisible,
  onClose,
  initialQuote,
  allQuotes,
  onLikeToggle,
  onShare,
  onViewed,
}) => {
  const { user } = useAuth();
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(-1);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const viewedIdsInModalSession = useRef(new Set<string>());

  useEffect(() => {
    if (isVisible && initialQuote) {
      const index = allQuotes.findIndex((q) => q.id === initialQuote.id);
      if (index !== -1) {
        setCurrentQuoteIndex(index);
        setCurrentQuote(allQuotes[index]);
        if (!viewedIdsInModalSession.current.has(initialQuote.id)) {
          onViewed(initialQuote.id);
          viewedIdsInModalSession.current.add(initialQuote.id);
        }
      } else {
        setCurrentQuote(initialQuote);
        setCurrentQuoteIndex(0);
        if (!viewedIdsInModalSession.current.has(initialQuote.id)) {
          onViewed(initialQuote.id);
          viewedIdsInModalSession.current.add(initialQuote.id);
        }
      }
    }
    if (!isVisible) {
      viewedIdsInModalSession.current.clear();
      setCurrentQuote(null);
      setCurrentQuoteIndex(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, initialQuote, allQuotes]);

  useEffect(() => {
    if (isVisible && currentQuote && allQuotes.length > 0) {
      const updated = allQuotes.find((q) => q.id === currentQuote.id);
      if (
        updated &&
        (updated.likes !== currentQuote.likes ||
          updated.views !== currentQuote.views ||
          updated.isLiked !== currentQuote.isLiked ||
          updated.affiliate_link !== currentQuote.affiliate_link ||
          updated.affiliate_clicks !== currentQuote.affiliate_clicks)
      ) {
        setCurrentQuote(updated);
      }
    }
  }, [isVisible, currentQuote, allQuotes]);

  const handleNavigation = useCallback(
    (direction: 'next' | 'prev') => {
      if (!currentQuote || allQuotes.length === 0) return;

      let newIndex = currentQuoteIndex;
      if (direction === 'next') {
        newIndex = (currentQuoteIndex + 1) % allQuotes.length;
      } else {
        newIndex = (currentQuoteIndex - 1 + allQuotes.length) % allQuotes.length;
      }

      const newQuote = allQuotes[newIndex];
      setCurrentQuoteIndex(newIndex);
      setCurrentQuote(newQuote);

      if (!viewedIdsInModalSession.current.has(newQuote.id)) {
        onViewed(newQuote.id);
        viewedIdsInModalSession.current.add(newQuote.id);
      }
    },
    [currentQuoteIndex, allQuotes, currentQuote, onViewed]
  );

  const handleShare = async (quote: Quote) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quote by ${quote.author}`,
          text: `"${quote.quote_text}" - ${quote.author}`,
          url: window.location.href,
        });
        onShare(quote);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      const shareText = `"${quote.quote_text}" - ${quote.author}`;
      navigator.clipboard.writeText(shareText);
      alert('Quote copied to clipboard!');
      onShare(quote);
    }
  };

  // NEW: open affiliate link + increment affiliate_clicks
  const handleOpenAffiliate = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentQuote?.affiliate_link) {
        alert('No affiliate link available for this quote.');
        return;
      }

      let urlStr = String(currentQuote.affiliate_link).trim();
      try {
        const url = new URL(urlStr);
        // Optionally add UTM params:
        // url.searchParams.set('utm_source', 'ogonjo_app');
        window.open(url.toString(), '_blank', 'noopener,noreferrer');

        // increment affiliate_clicks in the DB and update local state
        try {
          const newClicks = (currentQuote.affiliate_clicks || 0) + 1;
          const { data: updated, error: updateError } = await supabase
            .from('business_quotes')
            .update({ affiliate_clicks: newClicks })
            .eq('id', currentQuote.id)
            .select()
            .single();

          if (updateError) {
            console.error('Failed to update affiliate_clicks:', updateError);
          } else if (updated) {
            setCurrentQuote((prev) => (prev ? { ...prev, affiliate_clicks: newClicks } : prev));
          }
        } catch (err) {
          console.error('Affiliate click record error:', err);
        }
      } catch (err) {
        console.error('Invalid affiliate URL', err);
        alert('Affiliate link appears to be invalid.');
      }
    },
    [currentQuote]
  );

  if (!isVisible || !currentQuote) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <i className="ion-close-circle" />
        </button>

        <div className="scroll-view-content">
          <div className="quote-content">
            <p className="quote-text">"{currentQuote.quote_text}"</p>
            <p className="quote-author">- {currentQuote.author}</p>
            {currentQuote.category && <p className="quote-category">Category: {currentQuote.category}</p>}
            <div className="quote-metadata">
              <span>Posted: {new Date(currentQuote.created_at).toLocaleDateString()}</span>
            </div>
            {currentQuote.book_title && (
              <div style={{ marginTop: 8, fontWeight: 600 }}>Book: {currentQuote.book_title}</div>
            )}
          </div>

          <div className="action-buttons-container">
            <button
              className="action-button"
              onClick={() => onLikeToggle(currentQuote.id, currentQuote.isLiked || false)}
            >
              <i
                className={currentQuote.isLiked ? 'ion-heart' : 'ion-heart-outline'}
                style={{ color: currentQuote.isLiked ? Theme.colors.error : Theme.colors.textPrimary }}
              />
              <span className="action-button-text">Likes: {currentQuote.likes || 0}</span>
            </button>

            <button className="action-button" aria-hidden>
              <i className="ion-eye-outline" style={{ color: Theme.colors.textPrimary }} />
              <span className="action-button-text">Views: {currentQuote.views || 0}</span>
            </button>

            <button className="action-button" onClick={() => handleShare(currentQuote)}>
              <i className="ion-share-social-outline" style={{ color: Theme.colors.accent }} />
              <span className="action-button-text">Share</span>
            </button>

            {/* GET BOOK button (only when affiliate_link exists) - no count shown */}
            {currentQuote.affiliate_link && (
              <button
                className="affiliate-btn"
                onClick={handleOpenAffiliate}
                aria-label="Get Book (affiliate link)"
                title="Open affiliate link to get the book"
                style={{
                  background: 'linear-gradient(45deg,#48bb78,#2f855a)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  marginLeft: 8,
                }}
              >
                Get Book
              </button>
            )}
          </div>
        </div>

        <div className="navigation-buttons-container">
          <button className="nav-button" onClick={() => handleNavigation('prev')}>
            <i className="ion-arrow-back-circle-outline" />
            <span className="nav-button-text">Previous</span>
          </button>
          <button className="nav-button" onClick={() => handleNavigation('next')}>
            <i className="ion-arrow-forward-circle-outline" />
            <span className="nav-button-text">Next</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailModal;
