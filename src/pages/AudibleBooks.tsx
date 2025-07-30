
// ogonjo-web-app/src/pages/AudibleBooks.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Link, useNavigate } from 'react-router-dom';
import './AudibleBooks.css';
import BookCarousel from './BookCarousel';

interface AudibleBook {
  id: string;
  title: string;
  author: string;
  short_description: string | null;
  image_url: string | null;
  audible_affiliate_link: string;
  category: string | null;
  views: number;
  created_at: string;
}

const AudibleBooks = () => {
  const navigate = useNavigate();
  const [audibleBooks, setAudibleBooks] = useState<AudibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [filteredAudiobooks, setFilteredAudiobooks] = useState<AudibleBook[]>([]);

  const fetchAudibleBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('audible_books')
        .select('id, title, author, short_description, image_url, audible_affiliate_link, views, created_at, category')
        .order('created_at', { ascending: false });
      if (error) {
        setError(`Failed to load audible books. ${error.message}`);
        console.error('Error fetching audible books:', error);
      } else {
        const categorized = data.reduce((acc, book) => {
          if (book.category) {
            acc[book.category] = acc[book.category] || [];
            acc[book.category].push(book as AudibleBook);
          }
          return acc;
        }, {} as { [key: string]: AudibleBook[] });

        const latestByCategory = Object.values(categorized)
          .map(books => books.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3))
          .flat()
          .slice(0, 12); // Limit to 12 books
        setAudibleBooks(latestByCategory);
        console.log('Fetched books:', latestByCategory); // Debug log
      }
    } catch (err) {
      setError('Unexpected error loading audible books.');
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudibleBooks();
  }, []);

  useEffect(() => {
    const applyFilter = () => {
      let currentFiltered = [...audibleBooks];
      if (selectedCategoryFilter !== 'All') {
        currentFiltered = currentFiltered.filter(book => book.category === selectedCategoryFilter);
      }
      if (searchQuery.trim() !== '') {
        const lowercasedSearch = searchQuery.trim().toLowerCase();
        currentFiltered = currentFiltered.filter(
          book =>
            book.title.toLowerCase().includes(lowercasedSearch) ||
            book.author.toLowerCase().includes(lowercasedSearch) ||
            (book.short_description?.toLowerCase() || '').includes(lowercasedSearch) ||
            (book.category?.toLowerCase() || '').includes(lowercasedSearch)
        );
      }
      setFilteredAudiobooks(currentFiltered);
    };
    const handler = setTimeout(() => applyFilter(), 300);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategoryFilter, audibleBooks]);

  const handleCategoryFilterPress = useCallback((category: string) => {
    setSelectedCategoryFilter(category);
    setSearchQuery('');
  }, []);

  const renderAudibleBookSection = useCallback((title: string, data: AudibleBook[]) => {
    if (data.length === 0) return null;
    return (
      <div className="section-container">
        <div className="section-header-row">
          <h2 className="section-header">{title}</h2>
          <button className="see-all-button" onClick={() => alert(`Navigate to a full list of ${title}`)}>
            See All <span className="chevron-icon">›</span>
          </button>
        </div>
        <div className="horizontal-list">
          {data.map((item) => (
            <AudibleBookCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  }, []);

  const AudibleBookCard = ({ item }: { item: AudibleBook }) => {
    const handlePress = useCallback(async () => {
      if (item.audible_affiliate_link) {
        window.open(item.audible_affiliate_link, '_blank');
      } else {
        alert('No affiliate link available.');
      }
    }, [item.audible_affiliate_link]);

    return (
      <div className="audible-book-card-horizontal" onClick={handlePress}>
        <div className="card-image-wrapper">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="audible-book-image-horizontal" />
          ) : (
            <div className="audible-book-image-placeholder">No Image</div>
          )}
        </div>
        <div className="audible-book-text-container-horizontal">
          <h3 className="audible-book-title-horizontal" title={item.title}>{item.title}</h3>
          <p className="audible-book-author-horizontal">by {item.author}</p>
          <p className="audible-book-category-horizontal">{item.category}</p>
          <div className="audible-book-stats-horizontal">
            <span className="audible-book-stat-icon">👁️</span>
            <span className="audible-book-stat-text-horizontal">{item.views}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading && audibleBooks.length === 0) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
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

  const allCategories = ['All', ...new Set(audibleBooks.map(book => book.category).filter(Boolean))];

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
            <button className="clear-search-button" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
        <div className="category-filter-container sticky">
          {allCategories.map((cat) => (
            <button
              key={cat}
              className={`category-filter-pill ${selectedCategoryFilter === cat ? 'category-filter-pill-active' : ''}`}
              onClick={() => handleCategoryFilterPress(cat)}
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
            {renderAudibleBookSection('Latest Audiobooks', [...audibleBooks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6))}
            {renderAudibleBookSection('Most Popular Audiobooks', [...audibleBooks].sort((a, b) => b.views - a.views).slice(0, 6))}
            {renderAudibleBookSection('Most Viewed Audiobooks', [...audibleBooks].sort((a, b) => b.views - a.views).slice(0, 6))}
            {Object.entries(
              audibleBooks.reduce((acc, book) => {
                if (book.category) acc[book.category] = [...(acc[book.category] || []), book];
                return acc;
              }, {} as { [key: string]: AudibleBook[] })
            ).map(([category, books]) => (
              renderAudibleBookSection(`Top in ${category}`, books.sort((a, b) => b.views - a.views).slice(0, 6))
            ))}
            <div className="ad-banner">Ad: Business Book Club - Join Now</div>
            <div className="ad-banner">Ad: Unlock Business Growth Audio</div>
          </>
        )}
      </div>
    </div>
  );
};

export default AudibleBooks;
