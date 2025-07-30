// ogonjo-web-app/src/pages/IdeaContent.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import IdeaReaderModal from './components/IdeaReaderModal';
import './IdeaContent.css';

interface StructuredIdeaContent {
  overview: {
    problem: string;
    solution: string;
    target_audience: string;
    unique_selling_proposition: string;
    origin_story?: string;
    motivational_quote?: string;
  };
  // Include other fields as needed
}

interface BusinessIdeaDetail {
  id: string;
  title: string;
  category: string;
  short_description: string;
  structured_idea_content: StructuredIdeaContent | null;
  difficulty: string;
  market_size: string;
  investment_needed: string;
  timeline: string;
  views: number;
  likes: number;
  comments_count: number;
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

const IdeaContent = () => {
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
        const formattedComments = data.idea_comments?.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
        })) || [];
        setComments(formattedComments);
        setIdea(data as BusinessIdeaDetail);
      } else {
        setError('Idea not found.');
      }
    } catch (err: any) {
      setError('Failed to load idea details.');
    } finally {
      setLoading(false);
    }
  }, [initialIdea?.id, state]);

  useEffect(() => {
    if (!initialIdea?.id) navigate('/ideas');
    else fetchIdeaAndComments();
  }, [initialIdea?.id, navigate, fetchIdeaAndComments]);

  const handleLikeToggle = useCallback(async () => {
    setIsLiked(!isLiked);
    alert(isLiked ? 'Unliked!' : 'Liked!');
  }, [isLiked]);

  const handleSaveToggle = useCallback(async () => {
    setIsSaved(!isSaved);
    alert(isSaved ? 'Unsaved!' : 'Saved!');
  });

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
      if (data) setComments([data, ...comments]);
      setNewComment('');
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    }
  }, [idea?.id, newComment, comments]);

  const openLink = (url: string | null) => {
    if (url) window.open(url, '_blank');
    else alert('No link available.');
  };

  const handleBuyGuide = () => {
    alert('Redirect to payment page for Full Startup Guideline!');
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (error || !idea) return <div className="error-container">{error || 'Idea not found.'}</div>;

  return (
    <div className="idea-content-page">
      <div className="idea-header">
        <h1 className="idea-title">{idea.title}</h1>
        <p className="idea-category">Category: {idea.category}</p>
        <div className="idea-stats">
          <span>👀 {idea.views || 0}</span>
          <span>❤️ {idea.likes || 0}</span>
        </div>
      </div>
      <div className="idea-details">
        <p className="idea-description">{idea.short_description}</p>
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
          <button className="action-btn book-btn" onClick={() => openLink(idea.affiliate_links[0])}>
            📚 Book
          </button>
        )}
        <button className="action-btn comment-btn" onClick={() => alert(`Comments: ${idea.comments_count || 0}`)}>
          💬 {idea.comments_count || 0}
        </button>
        <button className="action-btn buy-guide-btn" onClick={handleBuyGuide}>
          💰 Buy Full Startup Guideline
        </button>
      </div>
      <div className="gamification-bar">
        <span>Progress: 50% - Unlock Full Idea!</span>
      </div>
      <button className="read-full-btn" onClick={() => setIsModalOpen(true)}>
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
        <button className="action-btn" onClick={handleAddComment}>Post Comment</button>
      </div>

      <IdeaReaderModal
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ideaTitle={idea.title}
        structuredIdea={idea.structured_idea_content || {
          overview: {
            problem: 'Full content unavailable. Purchase the guide for details!',
            solution: '',
            target_audience: '',
            unique_selling_proposition: '',
          },
        }}
      />
    </div>
  );
};

export default IdeaContent;
