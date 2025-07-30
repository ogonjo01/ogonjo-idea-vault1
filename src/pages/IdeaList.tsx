
// ogonjo-web-app/src/pages/IdeaList.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import '../styles/IdeaList.css';

interface BusinessIdea {
  id: string;
  title: string;
  category: string;
  description: string;
  likes_count: number;
  comments_count: number;
  views: number;
  youtube_link?: string | null;
  full_book_link?: string | null;
  affiliate_links?: string[] | null;
}

const GenericListItem: React.FC<{ item: any }> = ({ item }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (item.url && item.title) {
      navigate(`/article/${encodeURIComponent(item.url)}`, { state: { title: item.title } });
    } else if (item.pair && item.rate) {
      alert(`Currency Rate: ${item.pair}\nRate: ${item.rate.toFixed(4)}`);
    } else if (item.id && item.title && item.description !== undefined) {
      navigate(`/ideas/${item.id}`, { state: { ideaTitle: item.title } });
    } else {
      alert(`Title: ${item.title || item.pair || 'N/A'}\nSource: ${item.sourceName || item.source || 'N/A'}`);
    }
  };

  return (
    <div className="list-item" onClick={handleClick}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.title} className="list-item-image" />
      ) : item.pair ? (
        <i className="ion-cash-outline list-item-icon" />
      ) : (
        <i className="ion-document-text-outline list-item-icon" />
      )}
      <div className="list-item-content">
        <h3>{item.title || item.pair}</h3>
        {item.description && <p className="list-item-description">{item.description}</p>}
        {item.sourceName && <span>Source: {item.sourceName}</span>}
        {item.source && <span>Source: {item.source}</span>}
        {item.publishedAt && <span>Published: {new Date(item.publishedAt).toLocaleDateString()}</span>}
        {item.publishedDate && <span>Published: {item.publishedDate}</span>}
        {item.rate && <span>Rate: {item.rate.toFixed(4)}</span>}
      </div>
    </div>
  );
};

const IdeaList: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { title, filterType, categoryName, items } = state || {};
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatIdeaData = (data: any[]): BusinessIdea[] => {
    return data?.map(idea => ({
      id: idea.id,
      title: idea.title,
      category: idea.category,
      description: idea.short_description || idea.description || '',
      likes_count: idea.likes || 0,
      comments_count: idea.idea_comments?.[0]?.count || 0,
      views: idea.views || 0,
      youtube_link: idea.youtube_link,
      full_book_link: idea.full_book_link,
      affiliate_links: Array.isArray(idea.affiliate_links) ? idea.affiliate_links : (typeof idea.affiliate_links === 'string' && idea.affiliate_links.length > 0 ? idea.affiliate_links.split(',').map((link: string) => link.trim()) : null),
    })) || [];
  };

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (items) {
        setDisplayItems(JSON.parse(items));
      } else {
        let query = supabase
          .from('business_ideas')
          .select(`
            id,
            title,
            category,
            short_description,
            description,
            views,
            youtube_link,
            full_book_link,
            affiliate_links,
            likes,
            idea_comments(count)
          `);

        if (categoryName) {
          query = query.eq('category', categoryName);
        }

        switch (filterType) {
          case 'latest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'mostLiked':
          case 'mostPopular':
            query = query.order('likes', { ascending: false });
            break;
          case 'mostViewed':
          case 'trending':
            query = query.order('views', { ascending: false });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        setDisplayItems(formatIdeaData(data));
      }
    } catch (e: any) {
      setError(`Failed to load items: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [items, filterType, categoryName]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading {title || 'items'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <i className="ion-alert-circle-outline" />
        <p>{error}</p>
        <button onClick={fetchIdeas} className="retry-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="idea-list-container">
      <div className="header">
        <button onClick={() => navigate(-1)} className="back-button">
          <i className="ion-arrow-back" />
        </button>
        <h1>{title}</h1>
        <div className="placeholder"></div>
      </div>
      {displayItems.length === 0 ? (
        <div className="empty-container">
          <i className="ion-information-circle-outline" />
          <p>No items found for "{title}".</p>
        </div>
      ) : (
        <div className="list-content">
          {displayItems.map(item => (
            <GenericListItem key={item.id || item.pair || Math.random()} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default IdeaList;