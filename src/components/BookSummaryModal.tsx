// src/components/BookSummaryModal.tsx
import React, { useEffect, useRef } from 'react';
import '../styles/BookSummaryModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookTitle?: string | null;
  bookSummary?: string | null;
  affiliateLink?: string | null;
  onAffiliateClick?: (e: React.MouseEvent) => void; // if provided, modal uses it
}

const BookSummaryModal: React.FC<Props> = ({ isOpen, onClose, bookTitle, bookSummary, affiliateLink, onAffiliateClick }) => {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement;
      // small timeout to ensure DOM painted
      setTimeout(() => closeBtnRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      try {
        (previouslyFocused.current as HTMLElement | null)?.focus();
      } catch {}
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="book-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="book-modal" onClick={(e) => e.stopPropagation()}>
        <div className="book-modal-header">
          <h3 className="book-modal-title">{bookTitle || 'Book Summary'}</h3>
          <button ref={closeBtnRef} className="book-modal-close" onClick={onClose} aria-label="Close summary">✕</button>
        </div>

        <div className="book-modal-body">
          {bookSummary ? (
            <div className="book-summary-text" dangerouslySetInnerHTML={{ __html: bookSummary }} />
          ) : (
            <p className="book-summary-empty">No summary available for this book.</p>
          )}
        </div>

        <div className="book-modal-footer">
          {affiliateLink ? (
            <button
              className="book-get-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onAffiliateClick) onAffiliateClick(e);
                else {
                  try {
                    const url = new URL(String(affiliateLink));
                    window.open(url.toString(), '_blank', 'noopener,noreferrer');
                  } catch {
                    alert('Affiliate link appears invalid.');
                  }
                }
              }}
            >
              Get Book
            </button>
          ) : (
            <div className="affiliate-missing">No purchase link available</div>
          )}

          <button className="book-modal-close-secondary" onClick={onClose}>Close</button>

          <div className="affiliate-disclosure">
            <small>Affiliate link — we may earn a commission if you purchase.</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSummaryModal;
