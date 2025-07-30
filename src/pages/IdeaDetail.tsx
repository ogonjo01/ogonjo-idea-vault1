// ogonjo-web-app/src/pages/IdeaDetail.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '../services/supabase';
import { Theme } from '../constants/Theme';
import IdeaReaderModal from './components/IdeaReaderModal';
import './IdeaDetail.css';

interface StructuredIdeaContent {
  overview: {
    problem: string;
    solution: string;
    target_audience: string;
    unique_selling_proposition: string;
    origin_story?: string;
    motivational_quote?: string;
  };
  inspiration_references?: Array<{
    company_name: string;
    summary: string;
    link: string;
  }>;
  market_analysis?: {
    market_size_potential: string;
    competitor_landscape: string[];
    competitive_advantage: string;
    emerging_trends?: string;
    customer_personas?: Array<{
      persona_name: string;
      demographics: string;
      pain_points: string;
      decision_drivers: string;
    }>;
  };
  product_service_details?: {
    features_functionality: string[];
    technology_stack?: string;
    development_roadmap?: Array<{
      phase: string;
      deliverables: string[];
      estimated_timeline: string;
    }>;
    proof_of_concept_links?: string[];
  };
  business_model?: {
    revenue_streams: string[];
    pricing_strategy?: string;
    cost_structure?: string[];
    unit_economics?: {
      lifetime_value: string;
      customer_acquisition_cost: string;
      payback_period: string;
    };
  };
  marketing_sales_strategy?: {
    customer_acquisition_channels: string[];
    marketing_campaigns?: Array<{
      campaign_name: string;
      objective: string;
      key_metrics: string[];
    }>;
    sales_process_overview?: string;
    channel_partners?: string[];
  };
  team_management?: {
    key_team_members?: Array<{
      name: string;
      role: string;
      background: string;
    }>;
    organizational_structure?: string;
    hiring_plan?: Array<{
      position: string;
      timeline: string;
      required_skills: string[];
    }>;
    advisory_board?: string[];
  };
  financial_projections?: {
    startup_costs_estimate?: string;
    funding_requirements?: string;
    break_even_point?: string;
    projected_revenue_growth?: string;
    key_financial_ratios?: {
      gross_margin: string;
      net_margin: string;
      burn_rate: string;
    };
  };
  risk_mitigation?: {
    potential_risks: string[];
    mitigation_strategies: string[];
    fallback_plans?: string[];
  };
  next_steps_roadmap?: Array<{
    milestone: string;
    deliverable: string;
    due_date: string;
  }>;
  summary_conclusion?: string;
}

interface BusinessIdeaDetail {
  id: string;
  title: string;
  category: string;
  short_description: string;
  content_text: string;
  structured_idea_content: StructuredIdeaContent | null;
  difficulty: string;
  market_size: string;
  investment_needed: string;
  timeline: string;
  tags: string[];
  views: number;
  is_featured: boolean;
  user_id: string;
  likes: number;
  comments_count: number;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
  isLiked?: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

type AIExpandedIdeaContent = StructuredIdeaContent;

const IdeaDetail: React.FC = () => {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [idea, setIdea] = useState<BusinessIdeaDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [aiGeneratedDetailedIdea, setAiGeneratedDetailedIdea] = useState<AIExpandedIdeaContent | null>(null);
  const [isGeneratingAIContent, setIsGeneratingAIContent] = useState(false);
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isIdeaReaderModalVisible, setIsIdeaReaderModalVisible] = useState(false);

  const isStructuredContent = (content: any): content is StructuredIdeaContent => {
    return typeof content === 'object' && content !== null && 'overview' in content;
  };

  const checkSavedStatus = useCallback(async () => {
    if (!user) {
      setIsSaved(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('saved_ideas')
        .select('id')
        .eq('user_id', user.id)
        .eq('idea_id', ideaId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking saved status:', error.message);
        setIsSaved(false);
      } else {
        setIsSaved(!!data);
      }
    } catch (err: any) {
      console.error('Unexpected error in checkSavedStatus:', err.message);
      setIsSaved(false);
    }
  }, [user, ideaId]);

  const fetchIdeaAndComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: ideaData, error: supabaseError } = await supabase
        .from('business_ideas')
        .select(`
          *,
          idea_comments(id, user_id, content, created_at, profiles(full_name, email))
        `)
        .eq('id', ideaId)
        .single();

      if (supabaseError) {
        console.error('Supabase fetch error:', supabaseError.message);
        throw supabaseError;
      }

      if (ideaData) {
        let isLikedByCurrentUser = false;
        if (user) {
          const { data: likeData, error: likeError } = await supabase
            .from('user_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('idea_id', ideaData.id)
            .single();
          if (!likeError || likeError.code === 'PGRST116') {
            isLikedByCurrentUser = !!likeData;
          } else {
            console.error('Error checking user like:', likeError.message);
          }
        }
        setIsLiked(isLikedByCurrentUser);

        const formattedComments: Comment[] = ideaData.idea_comments?.map((comment: any) => ({
          id: comment.id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          profiles: comment.profiles,
        })) || [];
        setComments(formattedComments);

        const formattedTags = Array.isArray(ideaData.tags)
          ? ideaData.tags
          : typeof ideaData.tags === 'string'
          ? ideaData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag)
          : [];
        const formattedAffiliateLinks = Array.isArray(ideaData.affiliate_links)
          ? ideaData.affiliate_links
          : typeof ideaData.affiliate_links === 'string' && ideaData.affiliate_links.length > 0
          ? ideaData.affiliate_links.split(',').map((link: string) => link.trim())
          : null;

        setIdea({
          ...ideaData,
          tags: formattedTags,
          affiliate_links: formattedAffiliateLinks,
          isLiked: isLikedByCurrentUser,
        });

        await supabase.rpc('increment_idea_views', { idea_id_param: ideaData.id });
        setIdea(prev => prev ? { ...prev, views: (prev.views || 0) + 1 } : null);
      } else {
        setError('Idea not found.');
      }
    } catch (err: any) {
      console.error('Failed to load idea details:', err.message);
      setError('Failed to load idea details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [ideaId, user]);

  useEffect(() => {
    if (!authLoading && ideaId) {
      fetchIdeaAndComments();
      checkSavedStatus();
    } else if (!ideaId) {
      setLoading(false);
      setError('No idea ID provided. Cannot load details.');
    }
  }, [authLoading, ideaId, fetchIdeaAndComments, checkSavedStatus]);

  const handleLikeToggle = useCallback(async () => {
    if (!user || !idea) {
      alert('Please sign in to like ideas.');
      navigate('/auth');
      return;
    }

    try {
      const { data: existingLike, error: checkError } = await supabase
        .from('user_likes')
        .select('id')
        .eq('idea_id', idea.id)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_likes')
          .insert({ idea_id: idea.id, user_id: user.id });

        if (insertError) throw insertError;
        setIsLiked(true);
        await supabase.rpc('increment_idea_likes', { idea_id_param: idea.id });
        setIdea(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
        alert('Liked! You liked this idea.');
      } else if (!checkError) {
        const { error: deleteError } = await supabase
          .from('user_likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) throw deleteError;
        setIsLiked(false);
        await supabase.rpc('decrement_idea_likes', { idea_id_param: idea.id });
        setIdea(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) - 1) } : null);
        alert('Unliked! You unliked this idea.');
      } else {
        throw checkError;
      }
    } catch (err: any) {
      alert(`Failed to toggle like: ${err.message}`);
    }
  }, [idea, user, navigate]);

  const handleSaveToggle = useCallback(async () => {
    if (!user || !idea) {
      alert('Please sign in to save ideas.');
      navigate('/auth');
      return;
    }

    try {
      const { data: existingSave, error: checkError } = await supabase
        .from('saved_ideas')
        .select('id')
        .eq('idea_id', idea.id)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('saved_ideas')
          .insert({ idea_id: idea.id, user_id: user.id });

        if (insertError) throw insertError;
        setIsSaved(true);
        alert('Saved! Idea added to your saved list!');
      } else if (!checkError) {
        const { error: deleteError } = await supabase
          .from('saved_ideas')
          .delete()
          .eq('id', existingSave.id);

        if (deleteError) throw deleteError;
        setIsSaved(false);
        alert('Unsaved! Idea removed from your saved list.');
      } else {
        throw checkError;
      }
    } catch (err: any) {
      alert(`Failed to toggle save: ${err.message}`);
    }
  }, [idea, user, navigate]);

  const handleAddComment = useCallback(async () => {
    if (!user || !idea) {
      alert('Please sign in to comment.');
      navigate('/auth');
      return;
    }
    if (!newComment.trim()) {
      alert('Comment cannot be empty.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .insert({ idea_id: idea.id, user_id: user.id, content: newComment.trim() })
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles(full_name, email)
        `)
        .single();

      if (error) throw error;
      if (data) {
        setComments(prev => [data, ...prev]);
        setNewComment('');
      }
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [idea, user, newComment, navigate]);

  const openLink = (url: string | null | undefined) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('This link is not available.');
    }
  };

  const handleShare = useCallback(async () => {
    if (!idea) {
      alert('No idea loaded to share.');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: `OGONJO Idea: ${idea.title}`,
          text: `Check out this business idea: "${idea.title}" on OGONJO!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Idea link copied to clipboard!');
      }
    } catch (error: any) {
      alert('Failed to share the idea.');
    }
  }, [idea]);

  const generateDetailedIdeaContent = useCallback(async () => {
    if (!idea) {
      alert('No business idea loaded to expand.');
      return;
    }
    if (!user) {
      alert('Please sign in to use AI features.');
      navigate('/auth');
      return;
    }

    setIsGeneratingAIContent(true);
    setAiGeneratedDetailedIdea(null);
    setIsAiModalVisible(true);

    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: idea.title, description: idea.short_description }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const parsedJson: AIExpandedIdeaContent = await response.json();
      setAiGeneratedDetailedIdea(parsedJson);
    } catch (error: any) {
      alert(`AI Generation Failed: ${error.message || 'Could not generate detailed idea.'}`);
      setAiGeneratedDetailedIdea(null);
    } finally {
      setIsGeneratingAIContent(false);
    }
  }, [idea, user, navigate]);

  if (loading || authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading idea details...</p>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="error-container">
        <p className="error-text">{error || 'Idea not found.'}</p>
        <button className="retry-button" onClick={fetchIdeaAndComments}>
          Retry
        </button>
      </div>
    );
  }

  const canReadFullIdea = isStructuredContent(idea.structured_idea_content);

  return (
    <div className="idea-detail-container">
      <div className="top-header-container">
        <h1 className="title">{idea.title}</h1>
        {idea.category && <p className="category-text">Category: {idea.category}</p>}
        {idea.user_id && <p className="author">by {idea.user_id}</p>}

        <div className="stats-row">
          <div className="stat-item">
            <i className="fas fa-heart"></i>
            <span>{idea.likes || 0}</span>
          </div>
          <div className="stat-item">
            <i className="fas fa-eye"></i>
            <span>{idea.views || 0}</span>
          </div>
          <button className="like-button" onClick={handleLikeToggle}>
            <i className={`fas ${isLiked ? 'fa-heart' : 'fa-heart-o'}`}></i>
            <span>{isLiked ? 'Liked' : 'Like'}</span>
          </button>
        </div>

        <div className="divider"></div>

        <h2 className="short-description-header">Idea Overview:</h2>
        <p className="short-description-text">{idea.short_description}</p>

        <div className="metrics-container">
          {idea.difficulty && (
            <div className="metric-item">
              <i className="fas fa-trending-up"></i>
              <span>Difficulty: {idea.difficulty}</span>
            </div>
          )}
          {idea.market_size && (
            <div className="metric-item">
              <i className="fas fa-users"></i>
              <span>Market Size: {idea.market_size}</span>
            </div>
          )}
          {idea.investment_needed && (
            <div className="metric-item">
              <i className="fas fa-wallet"></i>
              <span>Investment: {idea.investment_needed}</span>
            </div>
          )}
          {idea.timeline && (
            <div className="metric-item">
              <i className="fas fa-hourglass"></i>
              <span>Timeline: {idea.timeline}</span>
            </div>
          )}
          {idea.tags && idea.tags.length > 0 && (
            <div className="metric-item">
              <i className="fas fa-tags"></i>
              <span>Tags: {idea.tags.join(', ')}</span>
            </div>
          )}
        </div>

        {canReadFullIdea ? (
          <button
            className="read-more-button"
            onClick={() => setIsIdeaReaderModalVisible(true)}
          >
            Read Full Idea
            <i className="fas fa-arrow-circle-right"></i>
          </button>
        ) : (
          <div className="read-more-disabled-container">
            <p className="read-more-disabled-text">
              Full structured idea content not available for this entry.
            </p>
          </div>
        )}
      </div>

      <div className="action-container">
        <button className="action-button" onClick={handleSaveToggle}>
          <i className={`fas ${isSaved ? 'fa-bookmark' : 'fa-bookmark-o'}`}></i>
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button className="action-button" onClick={handleShare}>
          <i className="fas fa-share"></i>
          Share
        </button>
        <button
          className="action-button"
          onClick={generateDetailedIdeaContent}
          disabled={isGeneratingAIContent}
        >
          {isGeneratingAIContent ? (
            <div className="spinner"></div>
          ) : (
            <>
              <i className="fas fa-lightbulb"></i>
              AI Expand
            </>
          )}
        </button>
      </div>

      {(idea.youtube_link || idea.full_book_link || (Array.isArray(idea.affiliate_links) && idea.affiliate_links.length > 0)) && (
        <div className="links-section">
          <h2 className="links-header">Related Links:</h2>
          {idea.youtube_link && (
            <button className="link-button" onClick={() => openLink(idea.youtube_link)}>
              <i className="fab fa-youtube"></i>
              Watch on YouTube
            </button>
          )}
          {idea.full_book_link && (
            <button className="link-button" onClick={() => openLink(idea.full_book_link)}>
              <i className="fas fa-link"></i>
              Full Idea/Resource
            </button>
          )}
          {Array.isArray(idea.affiliate_links) && idea.affiliate_links.map((link, index) => (
            <button key={index} className="link-button" onClick={() => openLink(link)}>
              <i className="fas fa-shopping-cart"></i>
              Recommended Book {index + 1}
            </button>
          ))}
        </div>
      )}

      <div className="comments-section">
        <h2 className="section-title">Comments ({comments.length})</h2>
        {comments.length === 0 ? (
          <p className="no-comments-text">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-card">
              <p className="comment-author">{comment.profiles?.full_name || comment.profiles?.email || 'Anonymous'}</p>
              <p className="comment-content">{comment.content}</p>
              <p className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</p>
            </div>
          ))
        )}
        {user ? (
          <div className="new-comment-container">
            <textarea
              className="comment-input"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              className="post-comment-button"
              onClick={handleAddComment}
              disabled={isSubmittingComment}
            >
              {isSubmittingComment ? <div className="spinner"></div> : 'Post Comment'}
            </button>
          </div>
        ) : (
          <p className="login-to-comment-text">Log in to add comments.</p>
        )}
      </div>

      {isAiModalVisible && aiGeneratedDetailedIdea && (
        <IdeaReaderModal
          isVisible={isAiModalVisible}
          onClose={() => setIsAiModalVisible(false)}
          ideaTitle={`AI Expanded: ${idea.title}`}
          structuredIdea={aiGeneratedDetailedIdea}
        />
      )}
      {isAiModalVisible && isGeneratingAIContent && (
        <div className="modal-overlay">
          <div className="modal-content-small">
            <div className="spinner"></div>
            <p className="modal-loading-text">Generating detailed insights...</p>
            <p className="modal-loading-sub-text">This might take a moment to generate a comprehensive report.</p>
          </div>
        </div>
      )}
      {isIdeaReaderModalVisible && canReadFullIdea && idea.structured_idea_content && (
        <IdeaReaderModal
          isVisible={isIdeaReaderModalVisible}
          onClose={() => setIsIdeaReaderModalVisible(false)}
          ideaTitle={idea.title}
          structuredIdea={idea.structured_idea_content}
        />
      )}
    </div>
  );
};

export default IdeaDetail;