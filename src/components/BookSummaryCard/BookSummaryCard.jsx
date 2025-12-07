import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaComment, FaStar } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import './BookSummaryCard.css';

/**
 * BookSummaryCard: IMPORTANT
 * - This card will ONLY use `description` for the preview text.
 * - It will NOT fall back to `summary` (heavy) under any circumstance.
 */

const BookSummaryCard = ({ summary = {}, onEdit, onDelete }) => {
  const {
    title = 'Untitled',
    author = 'Unknown',
    // prefer description for feed preview; do NOT fallback to summary
    description = '',
    // keep fullSummary variable but we're not going to use it for preview
    summary: fullSummary = '',
    id,
    slug, // prefer slug for friendly URLs
    likes_count = 0,
    views_count = 0,
    comments_count = 0,
    image_url = '',
    avg_rating = 0,
  } = summary;

  const getSummaryPath = (id, slug) => (slug ? `/summary/${slug}` : `/summary/${id}`);
  const summaryPath = getSummaryPath(id, slug);

  // sanitize and strip HTML, then truncate
  const cleanText = (text, maxLength = 140) => {
    if (!text) return '';
    // sanitize any HTML (remove tags)
    const cleaned = DOMPurify.sanitize(String(text || ''), { ALLOWED_TAGS: [] });
    const stripped = cleaned.replace(/<[^>]*>/g, '').trim();
    return stripped.length > maxLength ? `${stripped.substring(0, maxLength)}…` : stripped;
  };

  // IMPORTANT: previewText is derived ONLY from description.
  // If description is empty, show an empty string (no heavy fallback to summary).
  const previewText = description && String(description).trim()
    ? cleanText(description, 140)
    : '';

  return (
    <Link to={summaryPath} className="card-link" aria-label={`Open ${title}`}>
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

          {/* SUMMARY PREVIEW: only description (sanitized & truncated) */}
          <p className="summary-text" aria-hidden>{previewText}</p>

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
