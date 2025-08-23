import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';
import { BOOK_CATEGORIES } from '../constants/BookCategories';
import BookSummaryCarousel from './BookSummaryCarousel';
import './BookSummaries.css';

interface BookSummary {
  id: string;
  title: string;
  author: string;
  summary_content: any;
  short_description: string;
  likes: number;
  views: number;
  category: string;
  created_at: string;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

const BookSummaries: React.FC = () => {
  const navigate = useNavigate();
  const [latestSummaries, setLatestSummaries] = useState<BookSummary[]>([]);
  const [mostLikedSummaries, setMostLikedSummaries] = useState<BookSummary[]>([]);
  const [mostViewedSummaries, setMostViewedSummaries] = useState<BookSummary[]>([]);
  const [summariesByCategory, setSummariesByCategory] = useState<{ category: string; summaries: BookSummary[] }[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  const formatSummaryData = (data: any[]): BookSummary[] =>
    (data || []).map((summary: any) => ({
      id: summary.id,
      title: summary.title,
      author: summary.author,
      summary_content: summary.summary_content,
      short_description: summary.short_description,
      likes: summary.likes || 0,
      views: summary.views || 0,
      category: summary.category,
      created_at: summary.created_at,
      youtube_link: summary.youtube_link,
      full_book_link: summary.full_book_link,
      affiliate_links: Array.isArray(summary.affiliate_links)
        ? summary.affiliate_links
        : typeof summary.affiliate_links === 'string' && summary.affiliate_links.length > 0
        ? summary.affiliate_links.split(',').map((l: string) => l.trim())
        : null,
    }));

  const fetchDataForSection = async (
    orderByColumn: 'created_at' | 'likes' | 'views',
    limit = 6,
    category?: string,
    searchQueryParam?: string
  ): Promise<BookSummary[]> => {
    try {
      let query = supabase
        .from('book_summaries')
        .select(`
          id, title, author, summary_content, short_description,
          likes, views, category, created_at, youtube_link,
          full_book_link, affiliate_links
        `);

      if (category) query = query.eq('category', category);
      if (searchQueryParam) query = query.or(`title.ilike.%${searchQueryParam}%,author.ilike.%${searchQueryParam}%`);

      const { data, error: supabaseError } = await query
        .order(orderByColumn, { ascending: false })
        .limit(limit);

      if (supabaseError) throw supabaseError;
      return formatSummaryData(data || []);
    } catch (err: any) {
      console.error(`Fetch error (${orderByColumn}):`, err);
      return [];
    }
  };

  const fetchAllBookData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [latest, mostLiked, mostViewed] = await Promise.all([
        fetchDataForSection('created_at'),
        fetchDataForSection('likes'),
        fetchDataForSection('views'),
      ]);

      setLatestSummaries(latest);
      setMostLikedSummaries(mostLiked);
      setMostViewedSummaries(mostViewed);

      const byCat: { category: string; summaries: BookSummary[] }[] = [];
      for (const cat of BOOK_CATEGORIES) {
        const list = await fetchDataForSection('likes', 6, cat);
        if (list.length) byCat.push({ category: cat, summaries: list });
      }
      setSummariesByCategory(byCat);
      setFilteredSummaries(latest);
    } catch (err: any) {
      console.error('Fetch all error:', err);
      setError('Failed to load summaries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBookData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const applyFilter = async () => {
      if (searchQuery.trim() === '' && selectedCategoryFilter === 'All') {
        setFilteredSummaries(latestSummaries);
        return;
      }
      setLoading(true);
      const data = await fetchDataForSection(
        'created_at',
        20,
        selectedCategoryFilter !== 'All' ? selectedCategoryFilter : undefined,
        searchQuery.trim() || undefined
      );
      setFilteredSummaries(data);
      setLoading(false);
    };

    const t = setTimeout(applyFilter, 250);
    return () => clearTimeout(t);
  }, [searchQuery, selectedCategoryFilter, latestSummaries]);

  const handleCategoryFilterPress = (cat: string) => {
    setSelectedCategoryFilter(cat);
    setSearchQuery('');
  };

  const renderBookCard = (item: BookSummary) => (
    <article
      key={item.id}
      className="summary-card"
      role="article"
      aria-label={item.title}
      onClick={() => navigate(`/book-summary/${item.id}`)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/book-summary/${item.id}`); }}
    >
      <div className="summary-card-top">
        <div className="summary-card-image-placeholder" aria-hidden>📘</div>
        <div className="summary-card-meta">
          <h3 className="summary-card-title">{item.title}</h3>
          <p className="summary-card-author">{item.author || 'Unknown author'}</p>
        </div>
      </div>

      <p className="summary-card-description">{item.short_description || ''}</p>

      <div className="summary-card-footer">
        <div className="summary-card-stats">
          <div className="stat" title={`${item.views} views`} aria-hidden>
            <span className="stat-icon">👁️</span>
            <span className="stat-number">{item.views ?? 0}</span>
          </div>
          <div className="stat" title={`${item.likes} likes`} aria-hidden>
            <span className="stat-icon">❤️</span>
            <span className="stat-number">{item.likes ?? 0}</span>
          </div>
        </div>

        <button
          className="view-details-btn"
          onClick={(e) => { e.stopPropagation(); navigate(`/book-summary/${item.id}`); }}
          aria-label={`View details for ${item.title}`}
        >
          View
        </button>
      </div>
    </article>
  );

  const renderSection = (title: string, data: BookSummary[]) => {
    if (!data.length || searchQuery || selectedCategoryFilter !== 'All') return null;
    return (
      <section className="section-container" key={title}>
        <h2 className="section-header">{title}</h2>
        <div className="summaries-grid">
          {data.map((summary) => renderBookCard(summary))}
        </div>
      </section>
    );
  };

  if (loading && !searchQuery && selectedCategoryFilter === 'All') {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Loading summaries...</p>
      </div>
    );
  }

  if (error && !searchQuery && selectedCategoryFilter === 'All') {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchAllBookData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="book-summaries-container">
      <div className="carousel-wrapper" style={{ zIndex: 5 }}>
        <BookSummaryCarousel summaries={latestSummaries} />
      </div>

      <div className="content-wrapper" style={{ zIndex: 10, position: 'relative' }}>
        <header className="header">
          <h1 className="header-title">Book Summaries</h1>
          <button className="info-button" onClick={() => alert('Search using the bar below.')}>Info</button>
        </header>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search book summaries"
          />
          {searchQuery && (
            <button className="clear-search-button" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <AdBanner adUnitId="book_summaries_top_banner" advertiserName="Book Club Deals" callToAction="Join Now" />

        <h2 className="section-header">Browse by Category</h2>

        {/* Inline style ensures no wrapping/stacking even if other CSS interferes */}
        <div
          className="category-filter-container"
          role="tablist"
          aria-label="Browse by category"
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            padding: '8px 6px',
          }}
        >
          <button
            className={`category-filter-pill ${selectedCategoryFilter === 'All' ? 'category-filter-pill-active' : ''}`}
            onClick={() => handleCategoryFilterPress('All')}
            role="tab"
            aria-selected={selectedCategoryFilter === 'All'}
          >
            All
          </button>

          {BOOK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-filter-pill ${selectedCategoryFilter === cat ? 'category-filter-pill-active' : ''}`}
              onClick={() => handleCategoryFilterPress(cat)}
              role="tab"
              aria-selected={selectedCategoryFilter === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {(searchQuery || selectedCategoryFilter !== 'All') ? (
          loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p className="loading-text">Searching…</p>
            </div>
          ) : filteredSummaries.length ? (
            <section className="section-container">
              <h2 className="section-header">Results</h2>
              <div className="summaries-grid">
                {filteredSummaries.map((summary) => renderBookCard(summary))}
              </div>
            </section>
          ) : (
            <div className="empty-state-container">
              <p className="empty-state-text">No summaries found.</p>
            </div>
          )
        ) : (
          <>
            {renderSection('Latest Summaries', latestSummaries)}
            {renderSection('Most Popular Summaries', mostLikedSummaries)}
            {renderSection('Most Viewed Summaries', mostViewedSummaries)}
            <AdBanner adUnitId="book_summaries_mid_banner" advertiserName="Deep Dive Reads" callToAction="Explore More" />
            {summariesByCategory.map((section) => (
              <React.Fragment key={section.category}>
                {renderSection(`Most Popular in ${section.category}`, section.summaries)}
              </React.Fragment>
            ))}
            <AdBanner adUnitId="book_summaries_bottom_banner" advertiserName="Business Book Club" callToAction="Start Your Free Trial" />
          </>
        )}
      </div>
    </div>
  );
};

export default BookSummaries;
