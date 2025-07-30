import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '@/services/supabase';
import BookSummaryReaderModal from '@/components/BookSummaryReaderModal';
import './BookSummaryDetail.css';

interface BookMetadata {
  publication_date?: string;
  edition?: string;
  category_genre?: string;
  translator?: string;
}

interface ContextWhyItMatters {
  intro: string;
  backstory_impact?: string;
}

interface KeyConcept {
  name: string;
  definition: string;
  importance: string;
}

interface MemorableQuote {
  quote: string;
  source?: string;
}

interface StructuredSummaryContent {
  description: string;
  metadata?: BookMetadata;
  context_why_it_matters?: ContextWhyItMatters;
  core_thesis?: string;
  structure_overview?: string;
  key_concepts_frameworks?: KeyConcept[];
  illustrative_anecdotes?: string[];
  top_takeaways?: string[];
  memorable_quotes?: MemorableQuote[];
  practical_next_steps?: string[];
  further_resources?: {
    affiliate_retail_links?: string[];
    official_websites?: string[];
    author_interviews?: string[];
    youtube_summaries?: string[];
  };
  summary_reflection?: string;
}

interface OldSummarySection {
  type: 'paragraph' | 'heading' | 'main_idea' | 'actionable_insight' | 'key_takeaway' | 'quote';
  heading?: string;
  content: string;
}

function BookSummaryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fullStructuredContent, setFullStructuredContent] = useState<StructuredSummaryContent | OldSummarySection[] | null>(null);
  const [displayShortDescription, setDisplayShortDescription] = useState<string | null>(null);
  const [summaryTitle, setSummaryTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');
  const [youtubeLink, setYoutubeLink] = useState<string | null>(null);
  const [fullBookLink, setFullBookLink] = useState<string | null>(null);
  const [affiliateLinks, setAffiliateLinks] = useState<string[]>([]);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);

  const isNewStructuredContent = (content: any): content is StructuredSummaryContent => {
    return typeof content === 'object' && content !== null && 'description' in content && 'core_thesis' in content;
  };

  const getUserAffiliateLinks = () => {
    if (typeof affiliateLinks === 'string' && affiliateLinks.length > 0) {
      return affiliateLinks.split(',').map((link) => link.trim()).filter((link) => link.length > 0);
    }
    return Array.isArray(affiliateLinks) ? affiliateLinks : [];
  };

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
          youtube_link,
          full_book_link,
          affiliate_links,
          likes,
          views
        `)
        .eq('id', id)
        .single();

      if (supabaseError) {
        console.error('Supabase fetch error:', supabaseError.message);
        throw supabaseError;
      }

      if (data) {
        setSummaryTitle(data.title || 'Untitled');
        setBookAuthor(data.author || 'Unknown Author');
        setFullStructuredContent(data.summary_content);
        setYoutubeLink(data.youtube_link || null);
        setFullBookLink(data.full_book_link || null);
        setAffiliateLinks(data.affiliate_links || []);
        setLikes(data.likes || 0);
        setViews(data.views || 0);

        let determinedShortDesc: string | null = null;
        if (data.short_description) {
          determinedShortDesc = data.short_description;
        } else if (isNewStructuredContent(data.summary_content)) {
          determinedShortDesc = data.summary_content.description;
        } else if (Array.isArray(data.summary_content) && data.summary_content.length > 0) {
          determinedShortDesc = data.summary_content[0].content;
        }
        setDisplayShortDescription(determinedShortDesc);

        if (data.summary_content) {
          await supabase.rpc('increment_views', { summary_id: id });
          setViews((prev) => prev + 1);
        }

        if (user) {
          const { data: likeData, error: likeError } = await supabase
            .from('user_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('summary_id', id)
            .single();

          if (likeError && likeError.code !== 'PGRST116') {
            console.error('Error checking like status:', likeError.message);
          } else {
            setIsLiked(!!likeData);
          }
        }
      } else {
        setError('Summary content not found.');
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

  const handleLinkPress = (url: string | null | undefined) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Link Unavailable: This link is not provided.');
    }
  };

  const handleLikePress = async () => {
    if (!user) {
      alert('Please log in to like this summary.');
      navigate('/auth?auth=true');
      return;
    }

    try {
      if (isLiked) {
        const { error: deleteError } = await supabase
          .from('user_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('summary_id', id);

        if (deleteError) throw deleteError;
        await supabase.rpc('decrement_likes', { summary_id: id });
        setLikes((prev) => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        const { error: insertError } = await supabase
          .from('user_likes')
          .insert({ user_id: user.id, summary_id: id });

        if (insertError) throw insertError;
        await supabase.rpc('increment_likes', { summary_id: id });
        setLikes((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (err: any) {
      alert('Failed to update like status. Please try again.');
      console.error('Error updating like status:', err.message);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${summaryTitle} by ${bookAuthor}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        alert('Sharing not supported on this device.');
      }
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
      }).catch(err => {
        console.error('Error copying to clipboard:', err);
        alert('Failed to copy link. Please copy it manually.');
      });
    }
  };

  if (loading) {
    return (
      <div className="page-container loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading summary...</p>
      </div>
    );
  }

  if (error || !displayShortDescription) {
    return (
      <div className="page-container error-container">
        <p className="error-text">{error || 'Summary content not available or could not be parsed.'}</p>
        <button className="retry-button" onClick={fetchSummaryDetails}>Retry</button>
      </div>
    );
  }

  const canReadFullSummary = isNewStructuredContent(fullStructuredContent);

  return (
    <div className="page-container">
      <div className="top-header-container">
        <h1 className="title">{summaryTitle}</h1>
        <p className="author">by {bookAuthor}</p>
        <div className="stats-row">
          <div className="stat-item">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="stat-text">{likes}</span>
          </div>
          <div className="stat-item">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 0a10 10 0 100 20 10 10 0 000-20zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" clipRule="evenodd" />
            </svg>
            <span className="stat-text">{views}</span>
          </div>
          <button className="like-button" onClick={handleLikePress}>
            <svg className={`w-6 h-6 mr-1 ${isLiked ? 'text-red-500' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="like-button-text">{isLiked ? 'Liked' : 'Like'}</span>
          </button>
          <button className="like-button" onClick={handleShare}>
            <svg className="w-6 h-6 mr-1 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            <span className="like-button-text">Share</span>
          </button>
        </div>
        <div className="divider"></div>
        <h2 className="short-description-header">Summary Overview:</h2>
        <p className="short-description-text">{displayShortDescription}</p>
        {canReadFullSummary ? (
          <button className="read-more-button" onClick={() => setIsReaderModalOpen(true)}>
            <span className="read-more-button-text">Read Full Summary</span>
            <svg className="w-6 h-6 ml-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <div className="read-more-disabled-container">
            <p className="read-more-disabled-text">
              Full structured summary not available for this entry. Please upload new summaries to experience the full reader.
            </p>
          </div>
        )}
      </div>

      {(youtubeLink || fullBookLink || getUserAffiliateLinks().length > 0) && (
        <div className="links-section">
          <h2 className="links-header">Additional Resources:</h2>
          {youtubeLink && (
            <button className="link-button" onClick={() => handleLinkPress(youtubeLink)}>
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168V13.828l4.403-3.33L9.555 7.168zM8 5v10a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H9a1 1 0 00-1 1z" clipRule="evenodd" />
              </svg>
              <span className="link-button-text">Watch Video Summary</span>
            </button>
          )}
          {fullBookLink && (
            <button className="link-button" onClick={() => handleLinkPress(fullBookLink)}>
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10.392A7.968 7.968 0 009 15.196c1.255 0 2.443.29 3.5.804V5.804A7.968 7.968 0 009 4.804zM12 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="link-button-text">Purchase Full Book (Affiliate Link)</span>
            </button>
          )}
          {getUserAffiliateLinks().map((link, index) => (
            <button key={index} className="link-button" onClick={() => handleLinkPress(link)}>
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.757 5.757a1 1 0 000-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414 0zM3 10a1 1 0 01-1-1H1a1 1 0 110-2h1a1 1 0 011 1v1zM4.343 12.757a1 1 0 001.414 1.414l.707-.707a1 1 0 00-1.414-1.414l-.707.707zM17.657 12.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM16 12a1 1 0 10-2 0v1a1 1 0 102 0v-1zM12 16a1 1 0 100 2h1a1 1 0 100-2h-1z" />
              </svg>
              <span className="link-button-text">Affiliate Resource {index + 1}</span>
            </button>
          ))}
        </div>
      )}

      {canReadFullSummary && fullStructuredContent && (
        <BookSummaryReaderModal
          isOpen={isReaderModalOpen}
          onClose={() => setIsReaderModalOpen(false)}
          summaryTitle={summaryTitle}
          bookAuthor={bookAuthor}
          structuredSummary={fullStructuredContent as StructuredSummaryContent}
        />
      )}
    </div>
  );
}

export default BookSummaryDetail;