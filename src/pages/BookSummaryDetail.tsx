import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import BookSummaryReaderModal from '@/components/BookSummaryReaderModal';

interface RichSummaryContent {
  overview: string;
  // We’ll keep the interface minimal here since modal just shows overview html continuously
  [key: string]: any;
}

function BookSummaryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullStructuredContent, setFullStructuredContent] = useState<RichSummaryContent | null>(null);
  const [displayShortDescription, setDisplayShortDescription] = useState<string | null>(null);
  const [summaryTitle, setSummaryTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);

  const fetchSummaryDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('book_summaries')
        .select(`
          title,
          author,
          summary_content,
          short_description,
          likes,
          views
        `)
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        setSummaryTitle(data.title || 'Untitled');
        setBookAuthor(data.author || 'Unknown Author');
        setLikes(data.likes || 0);
        setViews(data.views || 0);

        let parsedContent: RichSummaryContent | null = null;
        if (typeof data.summary_content === 'string') {
          try {
            parsedContent = JSON.parse(data.summary_content);
          } catch {
            parsedContent = null;
          }
        } else if (typeof data.summary_content === 'object') {
          parsedContent = data.summary_content;
        }
        setFullStructuredContent(parsedContent);

        if (data.short_description) {
          setDisplayShortDescription(data.short_description);
        } else if (parsedContent?.overview) {
          // fallback: strip html tags and truncate to 300 chars
          const plainText = parsedContent.overview.replace(/<[^>]+>/g, '');
          setDisplayShortDescription(plainText.slice(0, 300) + '...');
        }

        if (data.summary_content) {
          await supabase.rpc('increment_views', { summary_id: id });
          setViews((prev) => prev + 1);
        }

        if (user) {
          const { data: likeData } = await supabase
            .from('user_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('summary_id', id)
            .single();

          setIsLiked(!!likeData);
        }
      } else {
        setError('Summary not found.');
      }
    } catch (err: any) {
      setError(`Failed to load summary details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchSummaryDetails();
  }, [fetchSummaryDetails]);

  const handleLikePress = async () => {
    if (!user) {
      alert('Please log in to like this summary.');
      navigate('/auth?auth=true');
      return;
    }

    try {
      if (isLiked) {
        await supabase.from('user_likes').delete().eq('user_id', user.id).eq('summary_id', id);
        await supabase.rpc('decrement_likes', { summary_id: id });
        setLikes((l) => Math.max(0, l - 1));
        setIsLiked(false);
      } else {
        await supabase.from('user_likes').insert({ user_id: user.id, summary_id: id });
        await supabase.rpc('increment_likes', { summary_id: id });
        setLikes((l) => l + 1);
        setIsLiked(true);
      }
    } catch {
      alert('Failed to update like status. Please try again.');
    }
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>Loading summary...</p>
    </div>
  );

  if (error || !displayShortDescription) return (
    <div style={styles.errorContainer}>
      <p style={styles.errorText}>{error || 'Summary content unavailable.'}</p>
      <button style={styles.retryButton} onClick={fetchSummaryDetails}>Retry</button>
    </div>
  );

  return (
    <div style={styles.pageContainer}>
      <header style={styles.header}>
        <h1 style={styles.title}>{summaryTitle}</h1>
        <p style={styles.author}>by {bookAuthor}</p>
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span role="img" aria-label="likes" style={styles.statEmoji}>❤️</span> {likes}
          </div>
          <div style={styles.statItem}>
            <span role="img" aria-label="views" style={styles.statEmoji}>👁️</span> {views}
          </div>
          <button
            style={{...styles.likeButton, ...(isLiked ? styles.likedButton : {})}}
            onClick={handleLikePress}
          >
            {isLiked ? '♥ Liked' : '♡ Like'}
          </button>
        </div>
      </header>

      <section style={styles.previewSection}>
        <p style={styles.shortDescription}>{displayShortDescription}</p>
        <button
          style={styles.readMoreButton}
          onClick={() => setIsReaderModalOpen(true)}
          aria-label="Read full summary"
        >
          Read More
        </button>
      </section>

      {isReaderModalOpen && fullStructuredContent && (
        <BookSummaryReaderModal
          isOpen={isReaderModalOpen}
          onClose={() => setIsReaderModalOpen(false)}
          summaryTitle={summaryTitle}
          bookAuthor={bookAuthor}
          fullHtmlContent={fullStructuredContent.overview || '<p>No content available.</p>'}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    maxWidth: 900,
    margin: '2rem auto',
    padding: '0 1rem',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#1e293b', // dark slate
    background: 'linear-gradient(135deg, #f0f4f8, #d9e2ec)',
    borderRadius: 12,
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  },
  header: {
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '1rem',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: 4,
    color: '#1e40af', // blue-900
  },
  author: {
    fontSize: '1.125rem',
    color: '#475569', // slate-600
    marginBottom: 8,
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    fontSize: '1rem',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#334155', // slate-700
  },
  statEmoji: {
    fontSize: 20,
  },
  likeButton: {
    background: '#e0e7ff', // blue-100
    border: 'none',
    borderRadius: 24,
    padding: '6px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    color: '#1e40af', // blue-900
    transition: 'background-color 0.3s ease',
  },
  likedButton: {
    background: '#3b82f6', // blue-500
    color: 'white',
  },
  previewSection: {
    textAlign: 'center',
  },
  shortDescription: {
    fontSize: '1.125rem',
    color: '#334155',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
  },
  readMoreButton: {
    background: '#2563eb', // blue-600
    color: 'white',
    border: 'none',
    borderRadius: 30,
    padding: '0.75rem 2.5rem',
    fontSize: '1.125rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(37, 99, 235, 0.4)',
    transition: 'background-color 0.3s ease',
  },
  loadingContainer: {
    minHeight: '50vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
    border: '6px solid #3b82f6',
    borderTop: '6px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: 16,
    fontSize: '1.125rem',
    color: '#64748b',
  },
  errorContainer: {
    minHeight: '50vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    color: '#dc2626',
  },
  errorText: {
    marginBottom: 20,
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  retryButton: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 20,
    padding: '0.5rem 1.5rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

// Spinner animation keyframes
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default BookSummaryDetail;
