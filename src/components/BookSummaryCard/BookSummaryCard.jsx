import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaComment, FaStar } from 'react-icons/fa';
import './BookSummaryCard.css';

const BookSummaryCard = ({ summary = {}, onEdit, onDelete }) => {
  const {
    title = 'Untitled',
    author = 'Unknown',
    summary: text = '',
    id,
    likes_count = 0,
    views_count = 0,
    comments_count = 0,
    image_url = '',
    avg_rating = 0,
  } = summary;

  // Function to strip HTML tags and truncate text
  const cleanText = (html, maxLength = 140) => {
    if (!html) return '';
    
    // Remove HTML tags
    const clean = html.replace(/<[^>]*>/g, '');
    
    // Truncate if needed
    return clean.length > maxLength ? clean.substring(0, maxLength) + '…' : clean;
  };

  return (
    <Link to={`/summary/${id}`} className="card-link" aria-label={`Open ${title}`}>
      <motion.div
        className="summary-card"
        data-post-id={id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        role="listitem"
      >
        {image_url ? (
          <div className="cover-wrap" aria-hidden="true">
            <img src={image_url} alt={`${title} cover`} className="book-cover-image" />
          </div>
        ) : (
          <div className="cover-placeholder" />
        )}

        <div className="card-content">
          <h3 className="book-title" title={title}>{title}</h3>
          <p className="book-author">by {author}</p>

          <p className="summary-text" aria-hidden>{cleanText(text)}</p>

          <div className="card-footer">
            <div className="engagement-item" aria-hidden>
              <FaHeart className="footer-icon" />
              <span className="eng-count">{likes_count || 0}</span>
            </div>

            <div className="engagement-item" aria-hidden>
              <FaComment className="footer-icon" />
              <span className="eng-count">{comments_count || 0}</span>
            </div>

            <div className="engagement-item" aria-hidden>
              <FaEye className="footer-icon" />
              <span className="eng-count">{views_count || 0}</span>
            </div>

            <div className="engagement-item rating" aria-hidden>
              <FaStar className="footer-icon star-icon" />
              <span className="eng-count">{avg_rating ? Number(avg_rating).toFixed(1) : '0.0'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default BookSummaryCard;


