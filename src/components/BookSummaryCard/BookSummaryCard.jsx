import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaComment, FaStar } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import './BookSummaryCard.css';

/**
 * BookSummaryCard (Content Feed)
 * - Uses ONLY `description` for preview text
 * - No fallback to full summary (performance + SEO)
 */

const BookSummaryCard = ({ summary = {}, onEdit, onDelete }) => {
  const {
    title = 'Untitled',
    author = 'Unknown',
    description = '',
    summary: fullSummary = '',
    id,
    slug,
    likes_count = 0,
    views_count = 0,
    comments_count = 0,
    image_url = '',
    avg_rating = 0,
  } = summary;

  const summaryPath = slug ? `/summary/${slug}` : `/summary/${id}`;

  // sanitize & truncate description (feed preview only)
  const cleanText = (text, maxLength = 140) => {
    if (!text) return '';
    const cleaned = DOMPurify.sanitize(String(text), { ALLOWED_TAGS: [] });
    const stripped = cleaned.replace(/<[^>]*>/g, '').trim();
    return stripped.length > maxLength
      ? `${stripped.substring(0, maxLength)}…`
      : stripped;
  };

  const previewText =
    description && String(description).trim()
      ? cleanText(description, 140)
      : '';

  return (
    <li
      className="summary-card-wrapper"
      role="listitem"
      data-post-id={id}
    >
      <Link
        to={summaryPath}
        className="card-link"
        aria-label={`Read ${title}`}
      >
        <motion.article
          className="summary-card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          {image_url ? (
            <div className="cover-wrap">
              <img
                src={image_url}
                alt={`Cover of ${title}`}
                className="book-cover-image"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="cover-placeholder" aria-hidden="true" />
          )}

          <div className="card-content">
            <h3 className="book-title">{title}</h3>

            <p className="book-author">
              by <span>{author}</span>
            </p>

            {/* Feed preview text (indexable, lightweight) */}
            {previewText && (
              <p className="summary-text">
                {previewText}
              </p>
            )}

            <footer className="card-footer" aria-hidden="true">
              <div className="engagement-item">
                <FaHeart className="footer-icon" />
                <span className="eng-count">{likes_count || 0}</span>
              </div>

              <div className="engagement-item">
                <FaComment className="footer-icon" />
                <span className="eng-count">{comments_count || 0}</span>
              </div>

              <div className="engagement-item">
                <FaEye className="footer-icon" />
                <span className="eng-count">{views_count || 0}</span>
              </div>

              <div className="engagement-item rating">
                <FaStar className="footer-icon star-icon" />
                <span className="eng-count">
                  {avg_rating ? Number(avg_rating).toFixed(1) : '0.0'}
                </span>
              </div>
            </footer>
          </div>
        </motion.article>
      </Link>
    </li>
  );
};

export default BookSummaryCard;
