import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '../services/supabase';
import { Theme } from '../constants/Theme';
import './SavedIdeas.css';

interface BusinessIdea {
  id: string;
  title: string;
  category: string;
  description: string;
  likes_count: number;
  comments_count: number;
  presentation_url: string;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

const SavedIdeas: React.FC = () => {
  const [savedIdeas, setSavedIdeas] = useState<BusinessIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const fetchSavedIdeas = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      setError('Please log in to view your saved ideas.');
      return;
    }

    setRefreshing(true);
    setError(null);
    try {
      const { data: savedData, error: savedError } = await supabase
        .from('saved_ideas')
        .select('idea_id')
        .eq('user_id', user.id);

      if (savedError) throw savedError;

      const ideaIds = savedData?.map(item => item.idea_id) || [];

      if (ideaIds.length === 0) {
        setSavedIdeas([]);
        return;
      }

      const { data: ideasData, error: ideasError } = await supabase
        .from('business_ideas')
        .select(`
          id,
          title,
          category,
          description,
          presentation_url,
          youtube_link,
          full_book_link,
          affiliate_links,
          likes_count:idea_likes(count),
          comments_count:idea_comments(count)
        `)
        .in('id', ideaIds)
        .order('created_at', { ascending: false });

      if (ideasError) throw ideasError;

      const formattedIdeas: BusinessIdea[] = ideasData?.map((idea: any) => ({
        id: idea.id,
        title: idea.title,
        category: idea.category,
        description: idea.description,
        presentation_url: idea.presentation_url,
        likes_count: idea.likes_count?.[0]?.count || 0,
        comments_count: idea.comments_count?.[0]?.count || 0,
        youtube_link: idea.youtube_link,
        full_book_link: idea.full_book_link,
        affiliate_links: Array.isArray(idea.affiliate_links) ? idea.affiliate_links : (typeof idea.affiliate_links === 'string' && idea.affiliate_links.length > 0 ? idea.affiliate_links.split(',').map((link: string) => link.trim()) : null),
      })) || [];

      setSavedIdeas(formattedIdeas);
    } catch (err: any) {
      console.error('Error fetching saved ideas:', err.message);
      setError('Failed to load saved ideas. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchSavedIdeas();
  }, [authLoading, fetchSavedIdeas]);

  const handleIdeaClick = (item: BusinessIdea) => {
    if (item.presentation_url) {
      navigate(`/discover/idea/${item.id}`, { state: { pdfUri: item.presentation_url, ideaTitle: item.title } });
    } else {
      alert('PDF Not Available: This idea does not have a PDF presentation.');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading saved ideas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button onClick={fetchSavedIdeas}>Retry</button>
      </div>
    );
  }

  return (
    <div className="saved-ideas-container">
      <h1>My Saved Ideas</h1>
      {savedIdeas.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state-text">You haven't saved any ideas yet.</p>
          <p className="empty-state-subtext">
            Explore the Discover tab and click the 'Save' button on ideas you like!
          </p>
          <button onClick={() => navigate('/discover')}>
            Go to Discover
          </button>
        </div>
      ) : (
        <div className="ideas-list">
          {savedIdeas.map(item => (
            <div key={item.id} className="idea-card" onClick={() => handleIdeaClick(item)}>
              <h3>{item.title}</h3>
              <p className="idea-category">{item.category}</p>
              <p className="idea-description">{item.description}</p>
              <div className="stats-container">
                <span>❤️ {item.likes_count || 0}</span>
                <span>💬 {item.comments_count || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedIdeas;