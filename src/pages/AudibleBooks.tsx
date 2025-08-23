// src/pages/AudibleBooks.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useNavigate } from 'react-router-dom';
import './AudibleBooks.css';
import BookCarousel from './BookCarousel';
import BookSummaryModal from '@/components/BookSummaryModal';

interface AudibleBook {
  id: string;
  title: string;
  author: string;
  short_description?: string | null;
  summary_text?: string | null;
  image_url?: string | null;
  audible_affiliate_link?: string | null;
  category?: string | null;
  views?: number;
  created_at?: string;
  audio_preview_url?: string | null;
  affiliate_clicks?: number | null;
}

const AudibleBooks: React.FC = () => {
  const navigate = useNavigate();
  const [audibleBooks, setAudibleBooks] = useState<AudibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [filteredAudiobooks, setFilteredAudiobooks] = useState<AudibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<AudibleBook | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingAffiliate, setProcessingAffiliate] = useState(false);

  const fetchAudibleBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('audible_books')
        .select(`
          id, title, author, short_description, summary_text,
          image_url, audible_affiliate_link, views, created_at, category,
          audio_preview_url, affiliate_clicks
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching audible books:', error);
        setError(`Failed to load audible books. ${error.message}`);
        setAudibleBooks([]);
        return;
      }

      if (!data) {
        setAudibleBooks([]);
        return;
      }

      // select recent subset similar to previous logic
      const categorized = (data as AudibleBook[]).reduce((acc: Record<string, AudibleBook[]>, book) => {
        const cat = book.category || '__uncategorized';
        acc[cat] = acc[cat] || [];
        acc[cat].push(book);
        return acc;
      }, {});

      const latestByCategory = Object.values(categorized)
        .map((books) =>
          books
            .sort((a, b) => {
              const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
              const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
              return tb - ta;
            })
            .slice(0, 3)
        )
        .flat()
        .slice(0, 12);

      setAudibleBooks(latestByCategory);
    } catch (err) {
      console.error('Unexpected error loading audible books:', err);
      setError('Unexpected error loading audible books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudibleBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const applyFilter = () => {
      let currentFiltered = [...audibleBooks];
      if (selectedCategoryFilter !== 'All') {
        currentFiltered = currentFiltered.filter((book) => book.category === selectedCategoryFilter);
      }
      if (searchQuery.trim() !== '') {
        const lower = searchQuery.trim().toLowerCase();
        currentFiltered = currentFiltered.filter((book) =>
          (book.title || '').toLowerCase().includes(lower) ||
          (book.author || '').toLowerCase().includes(lower) ||
          ((book.short_description || '') as string).toLowerCase().includes(lower) ||
          ((book.category || '') as string).toLowerCase().includes(lower)
        );
      }
      setFilteredAudiobooks(currentFiltered);
    };

    const t = setTimeout(applyFilter, 200);
    return () => clearTimeout(t);
  }, [searchQuery, selectedCategoryFilter, audibleBooks]);

  const handleCategoryFilterPress = useCallback((category: string) => {
    setSelectedCategoryFilter(category);
    setSearchQuery('');
  }, []);

  const openBookModal = (book: AudibleBook) => {
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBook(null);
  };

  // open affiliate link & update clicks
  const handleGetBook = async (book: AudibleBook) => {
    if (!book || !book.audible_affiliate_link) {
      alert('No affiliate link available for this book.');
      return;
    }

    let urlStr = String(book.audible_affiliate_link).trim();
    try {
      const url = new URL(urlStr);
      // open safely
      window.open(url.toString(), '_blank', 'noopener,noreferrer');

      try {
        setProcessingAffiliate(true);
        const newClicks = (book.affiliate_clicks || 0) + 1;
        const { data: updated, error: updateError } = await supabase
          .from('audible_books')
          .update({ affiliate_clicks: newClicks })
          .eq('id', book.id)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update affiliate_clicks:', updateError);
        } else if (updated) {
          setAudibleBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, affiliate_clicks: newClicks } : b)));
          setSelectedBook((prev) => (prev && prev.id === book.id ? { ...prev, affiliate_clicks: newClicks } : prev));
        }
      } catch (err) {
        console.error('Affiliate click record error:', err);
      } finally {
        setProcessingAffiliate(false);
      }
    } catch (err) {
      console.error('Invalid affiliate URL', err);
      alert('Affiliate link appears to be invalid.');
    }
  };

  // centered Listen / Share buttons + View button that opens modal
  const AudibleBookCard: React.FC<{ item: AudibleBook }> = ({ item }) => {
    return (
      <div className="audible-book-card-horizontal" role="article" aria-label={item.title || 'audiobook card'}>
        <div className="card-image-wrapper">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title || 'book cover'} className="audible-book-image-horizontal" />
          ) : (
            <div className="audible-book-image-placeholder">No Image</div>
          )}
        </div>

        <div className="audible-book-text-container-horizontal">
          <h3 className="audible-book-title-horizontal" title={item.title}>{item.title}</h3>
          <p className="audible-book-author-horizontal">by {item.author}</p>
          <p className="audible-book-category-horizontal">{item.category}</p>

          <div className="audible-book-actions">
            <button
              className="listen-btn-card"
              onClick={(e) => {
                e.stopPropagation();
                if (item.audible_affiliate_link) {
                  try { window.open(String(item.audible_affiliate_link), '_blank', 'noopener,noreferrer'); }
                  catch { /* noop */ }
                } else alert('No link available.');
              }}
            >
              Listen Now
            </button>

            <button
              className="share-btn-card"
              onClick={(e) => {
                e.stopPropagation();
                const url = item.audible_affiliate_link || '';
                if (navigator.clipboard && url) {
                  navigator.clipboard.writeText(url)
                    .then(() => alert('Link copied!'))
                    .catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
                } else {
                  window.open(url, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              Share
            </button>

            <button
              className="view-btn-card"
              onClick={(e) => {
                e.stopPropagation();
                openBookModal(item);
              }}
            >
              View
            </button>
          </div>

          <div className="audible-book-stats-horizontal" aria-hidden>
            <span className="audible-book-stat-icon">👁️</span>
            <span className="audible-book-stat-text-horizontal">{item.views ?? 0}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading && audibleBooks.length === 0) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p className="loading-text">Loading audiobooks...</p>
      </div>
    );
  }

  if (error && audibleBooks.length === 0) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={() => fetchAudibleBooks()}>Retry</button>
      </div>
    );
  }

  const allCategories = ['All', ...Array.from(new Set(audibleBooks.map((b) => b.category).filter(Boolean)))];

  return (
    <div className="safe-area">
      <div className="carousel-wrapper" style={{ zIndex: 5 }}>
        <BookCarousel books={audibleBooks} />
      </div>

      <div className="content-wrapper" style={{ zIndex: 10, position: 'relative' }}>
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by title, author, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button className="clear-search-button" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div
          className="category-filter-container sticky"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 8,
            paddingTop: 8,
            whiteSpace: 'nowrap'
          }}
        >
          {allCategories.map((cat) => (
            <button
              key={cat}
              className={`category-filter-pill ${selectedCategoryFilter === cat ? 'category-filter-pill-active' : ''}`}
              onClick={() => handleCategoryFilterPress(cat || 'All')}
              style={{ flex: '0 0 auto' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {(searchQuery.trim() !== '' || selectedCategoryFilter !== 'All') ? (
          filteredAudiobooks.length > 0 ? (
            <div className="filtered-results-container">
              <h2 className="section-header">Search Results</h2>
              <div className="grid-list">
                {filteredAudiobooks.map((item) => (
                  <AudibleBookCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state-container">
              <p className="empty-state-text">No audiobooks found.</p>
            </div>
          )
        ) : (
          <>
            <div className="ad-banner">Ad: Amazon Free Trial - Start Listening</div>

            <SectionRenderer title="Latest Audiobooks" data={[...audibleBooks].sort((a, b) => {
              const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
              const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
              return tb - ta;
            }).slice(0, 6)} AudibleBookCard={AudibleBookCard} />

            <SectionRenderer title="Most Popular Audiobooks" data={[...audibleBooks].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6)} AudibleBookCard={AudibleBookCard} />

            {Object.entries(audibleBooks.reduce((acc: Record<string, AudibleBook[]>, book) => {
              const cat = book.category || 'Uncategorized';
              acc[cat] = [...(acc[cat] || []), book];
              return acc;
            }, {})).map(([category, books]) =>
              <SectionRenderer
                key={category}
                title={`Top in ${category}`}
                data={books.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6)}
                AudibleBookCard={AudibleBookCard}
              />
            )}

            <div className="ad-banner">Ad: Business Book Club - Join Now</div>
            <div className="ad-banner">Ad: Unlock Business Growth Audio</div>
          </>
        )}
      </div>

      {/* Use the reusable modal component (sanitizes internally) */}
      <BookSummaryModal
        isOpen={isModalOpen}
        onClose={closeModal}
        bookTitle={selectedBook?.title ?? null}
        bookSummary={selectedBook?.short_description ?? selectedBook?.summary_text ?? null}
        affiliateLink={selectedBook?.audible_affiliate_link ?? null}
        onAffiliateClick={() => selectedBook && handleGetBook(selectedBook)}
      />
    </div>
  );
};

export default AudibleBooks;

/* helper */
function SectionRenderer({
  title,
  data,
  AudibleBookCard
}: {
  title: string;
  data: AudibleBook[];
  AudibleBookCard: React.FC<{ item: AudibleBook }>;
}) {
  if (!data || data.length === 0) return null;
  return (
    <div className="section-container">
      <div className="section-header-row">
        <h2 className="section-header">{title}</h2>
      </div>
      <div className="horizontal-list" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {data.map((item) => <AudibleBookCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
