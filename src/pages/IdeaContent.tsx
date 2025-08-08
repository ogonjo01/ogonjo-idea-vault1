// ogonjo-web-app/src/pages/IdeaContent.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import IdeaReaderModalDebug from './../components/IdeaReaderModalDebug';
import './IdeaContent.css';

type StructuredIdeaContent = any;

interface BusinessIdeaDetail {
  id: string;
  title: string;
  category: string | null;
  short_description: string | null;
  structured_idea_content: StructuredIdeaContent | null;
  content_text?: string | null;
  thumbnail?: string | null;
  thumbnail_url?: string | null;
  difficulty?: string | null;
  market_size?: string | null;
  investment_needed?: string | null;
  timeline?: string | null;
  views?: number | null;
  likes?: number | null;
  comments_count?: number | null;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const IdeaContent: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const initialIdea = state?.idea as BusinessIdeaDetail | undefined;

  const [idea, setIdea] = useState<BusinessIdeaDetail | null>(initialIdea || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchIdeaAndComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const id = initialIdea?.id || (state as any)?.id;
    if (!id) {
      setError('No idea ID provided.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('business_ideas')
        .select(`
          *,
          idea_comments(id, user_id, content, created_at)
        `)
        .eq('id', id)
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        const formattedComments = (data.idea_comments || []).map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
        })) as Comment[];

        // Normalize DB fields
        let structured = data.structured_idea_content ?? null;
        // If the DB stores the JSON as a string, parse it safely
        if (structured && typeof structured === 'string') {
          try {
            structured = JSON.parse(structured);
          } catch (e) {
            console.warn('Failed to parse structured_idea_content JSON:', e);
            // leave it as original string — we will not use steps in that case
          }
        }

        // Decide final contentHtml to show in modal:
        // 1) prefer content_text (editor HTML)
        // 2) else, if structured is an array or has .steps, build HTML from step.action (or description)
        let contentHtml: string | null = null;
        if (data.content_text && String(data.content_text).trim().length > 0) {
          contentHtml = String(data.content_text);
        } else if (structured) {
          // structured might be an array of steps or an object { steps: [...] }
          let steps: any[] = [];
          if (Array.isArray(structured)) {
            steps = structured;
          } else if (structured.steps && Array.isArray(structured.steps)) {
            steps = structured.steps;
          }

          if (steps.length > 0) {
            // join the HTML from each step (prefer step.action which may contain HTML)
            contentHtml = steps
              .map((s: any, idx: number) => {
                const action = s.action ?? s.description ?? '';
                // wrap in a container per step so styling is preserved
                return `<section data-step="${idx + 1}" style="margin-bottom:18px;">
                          ${action}
                        </section>`;
              })
              .join('\n');
          } else if ((structured as any).overview) {
            // fallback to overview fields (simple layout)
            const ov = (structured as any).overview;
            contentHtml = `<h3>Overview</h3>
                           <p><strong>Problem:</strong> ${ov.problem ?? ''}</p>
                           <p><strong>Solution:</strong> ${ov.solution ?? ''}</p>
                           <p><strong>Target Audience:</strong> ${ov.target_audience ?? ''}</p>
                           <p><strong>USP:</strong> ${ov.unique_selling_proposition ?? ''}</p>`;
          }
        }

        const normalized: BusinessIdeaDetail = {
          id: data.id,
          title: data.title,
          category: data.category ?? null,
          short_description: data.short_description ?? null,
          structured_idea_content: structured ?? null,
          content_text: contentHtml ?? data.content_text ?? null, // write back computed HTML into content_text field in state
          thumbnail: data.thumbnail ?? null,
          thumbnail_url: data.thumbnail_url ?? null,
          difficulty: data.difficulty ?? null,
          market_size: data.market_size ?? null,
          investment_needed: data.investment_needed ?? null,
          timeline: data.timeline ?? null,
          views: data.views ?? 0,
          likes: data.likes ?? 0,
          comments_count: data.comments ?? 0,
          youtube_link: data.youtube_link ?? null,
          full_book_link: data.full_book_link ?? null,
          affiliate_links: data.affiliate_links ?? null,
        };

        setComments(formattedComments);
        setIdea(normalized);
      } else {
        setError('Idea not found.');
      }
    } catch (err: any) {
      console.error('fetchIdeaAndComments error:', err);
      setError('Failed to load idea details.');
    } finally {
      setLoading(false);
    }
  }, [initialIdea?.id, state]);

  useEffect(() => {
    if (!initialIdea?.id) {
      navigate('/ideas');
      return;
    }
    fetchIdeaAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIdea?.id, navigate]);

  const handleLikeToggle = useCallback(async () => {
    setIsLiked((prev) => !prev);
    alert(isLiked ? 'Unliked!' : 'Liked!');
  }, [isLiked]);

  const handleSaveToggle = useCallback(async () => {
    setIsSaved((prev) => !prev);
    alert(isSaved ? 'Unsaved!' : 'Saved!');
  }, [isSaved]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) {
      alert('Comment cannot be empty.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .insert({ idea_id: idea?.id, content: newComment.trim() })
        .select('id, user_id, content, created_at')
        .single();
      if (error) throw error;
      if (data) setComments((prev) => [data as Comment, ...prev]);
      setNewComment('');
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    }
  }, [idea?.id, newComment]);

  const openLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else alert('No link available.');
  };

  const handleBuyGuide = () => {
    alert('Redirect to payment page for Full Startup Guideline!');
  };

  const handleReadFullIdeaClick = () => {
    console.log('Read Full Idea clicked. idea id:', idea?.id);
    if (!idea?.id) {
      console.warn('No idea available to open in modal');
      return;
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (error || !idea) return <div className="error-container">{error || 'Idea not found.'}</div>;

  return (
    <div className="idea-content-page">
      <div className="idea-header">
        <h1 className="idea-title">{idea.title}</h1>
        <p className="idea-category">Category: {idea.category ?? 'Uncategorized'}</p>
        <div className="idea-stats">
          <span>👀 {idea.views ?? 0}</span>
          <span>❤️ {idea.likes ?? 0}</span>
        </div>
      </div>

      <div className="idea-details">
        <p className="idea-description">{idea.short_description ?? ''}</p>
        <div className="idea-metrics">
          {idea.difficulty && <span>Difficulty: {idea.difficulty}</span>}
          {idea.market_size && <span>Market Size: {idea.market_size}</span>}
          {idea.investment_needed && <span>Investment: {idea.investment_needed}</span>}
          {idea.timeline && <span>Timeline: {idea.timeline}</span>}
        </div>
      </div>

      <div className="action-hub">
        <button className="action-btn like-btn" onClick={handleLikeToggle}>
          {isLiked ? '❤️ Liked' : '🤍 Like'}
        </button>
        <button className="action-btn save-btn" onClick={handleSaveToggle}>
          {isSaved ? '💾 Saved' : '💾 Save'}
        </button>
        <button className="action-btn share-btn" onClick={() => alert('Share this idea!')}>
          📤 Share
        </button>

        {idea.youtube_link && (
          <button className="action-btn youtube-btn" onClick={() => openLink(idea.youtube_link)}>
            🎥 YouTube
          </button>
        )}
        {idea.full_book_link && (
          <button className="action-btn full-idea-btn" onClick={() => openLink(idea.full_book_link)}>
            📖 Full Idea
          </button>
        )}
        {idea.affiliate_links && idea.affiliate_links.length > 0 && (
          <button className="action-btn book-btn" onClick={() => openLink(idea.affiliate_links![0])}>
            📚 Book
          </button>
        )}

        <button className="action-btn comment-btn" onClick={() => alert(`Comments: ${idea.comments_count ?? 0}`)}>
          💬 {idea.comments_count ?? 0}
        </button>
        <button className="action-btn buy-guide-btn" onClick={handleBuyGuide}>
          💰 Buy Full Startup Guideline
        </button>
      </div>

      <div className="gamification-bar">
        <span>Progress: 50% - Unlock Full Idea!</span>
      </div>

      <button className="read-full-btn" onClick={handleReadFullIdeaClick}>
        🔓 Read Full Idea
      </button>

      <div className="comments-section">
        <h3>Comments ({comments.length})</h3>
        {comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-card">
              <p>{comment.content}</p>
              <small>{new Date(comment.created_at).toLocaleDateString()}</small>
            </div>
          ))
        )}

        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="comment-input"
        />
        <button className="action-btn" onClick={handleAddComment}>
          Post Comment
        </button>
      </div>

    <IdeaReaderModalDebug
  isVisible={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  ideaTitle={idea.title}
  contentHtml={idea.content_text ?? null}
  shortDescription={idea.short_description ?? null}   // ← NEW
  structuredIdea={idea.structured_idea_content ?? null}
  rewriteStoragePaths={true}
  thumbnailUrl={idea.thumbnail_url ?? idea.thumbnail ?? null}
/>


    </div>
  );
};

export default IdeaContent;
