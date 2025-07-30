
// ogonjo-web-app/src/pages/Notifications.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '../services/supabase';
import { Theme } from '../constants/Theme';
import { AppNotification } from '../types/NotificationTypes';
import '../styles/Notifications.css';

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to load notifications. Please try again.');
        setNotifications([]);
      } else {
        setNotifications(data || []);
        // Mark notifications as read
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
      }
    } catch (err: any) {
      setError('An unexpected error occurred.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel('public:notifications_web')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const handleNotificationClick = (item: AppNotification) => {
    if (item.data?.screen) {
      if (item.data.screen === 'IdeaDetail') {
        navigate(`/ideas/${item.data.params.ideaId}`, { state: { ideaTitle: item.data.params.ideaTitle } });
      } else if (item.data.screen === 'ArticleWebView') {
        navigate(`/article/${encodeURIComponent(item.data.params.url)}`, { state: { title: item.data.params.title } });
      } else if (['IdeaList', 'CategoryExplore', 'Search', 'BusinessInsights'].includes(item.data.screen)) {
        navigate(`/${item.data.screen.toLowerCase()}`, { state: item.data.params });
      } else if (['CourseDetail', 'ChapterContent'].includes(item.data.screen)) {
        navigate(`/courses`, { state: item.data.params });
      } else if (item.data.screen === 'BookSummaryDetail') {
        navigate(`/book-summaries`, { state: item.data.params });
      } else if (['QuotesHome', 'QuoteList'].includes(item.data.screen)) {
        navigate(`/quotes`, { state: item.data.params });
      } else if (['UserProfile', 'SavedIdeas', 'CreateIdea'].includes(item.data.screen)) {
        navigate(`/profile`, { state: item.data.params });
      } else {
        alert(`${item.title}\n${item.body}`);
      }
    } else {
      alert(`${item.title}\n${item.body}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={fetchNotifications} className="retry-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <h1>Your Notifications</h1>
      {notifications.length === 0 ? (
        <div className="empty-container">
          <i className="ion-notifications-off-outline" />
          <p>No notifications yet!</p>
          <p className="empty-subtext">New content and updates will appear here.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(item => (
            <div
              key={item.id}
              className={`notification-item ${item.read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(item)}
            >
              <i className={item.read ? 'ion-mail-open-outline' : 'ion-mail-outline'} />
              <div className="notification-content">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span>{new Date(item.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
