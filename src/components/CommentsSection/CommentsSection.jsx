// src/components/CommentsSection/CommentsSection.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './CommentsSection.css';

const CommentsSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const fetchComments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, 
        created_at, 
        content,
        user_id,
        users:user_id (email)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to post a comment.');
      return;
    }
    if (newComment.trim() === '') return;

    const { error } = await supabase
      .from('comments')
      .insert({
        content: newComment,
        user_id: user.id,
        post_id: postId,
      });

    if (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } else {
      setNewComment('');
      fetchComments(); // Refresh the comments list
    }
  };

  const handleDeleteComment = async (commentId, authorId) => {
    if (user && user.id !== authorId) {
      alert("You can only delete your own comments.");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this comment?")) {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
  
      if (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment. Please try again.');
      } else {
        fetchComments(); // Refresh comments list
      }
    }
  };

  return (
    <div className="comments-section">
      <h4 className="comments-title">Comments ({comments.length})</h4>
      <form onSubmit={handlePostComment} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows="3"
        />
        <button type="submit" disabled={!user}>Post Comment</button>
      </form>

      <div className="comments-list">
        {isLoading ? (
          <p>Loading comments...</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{comment.users?.email || 'Anonymous'}</span>
                <span className="comment-date">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
                {user && user.id === comment.user_id && (
                  <button onClick={() => handleDeleteComment(comment.id, comment.user_id)} className="delete-comment-button">
                    &times;
                  </button>
                )}
              </div>
              <p className="comment-content">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsSection;