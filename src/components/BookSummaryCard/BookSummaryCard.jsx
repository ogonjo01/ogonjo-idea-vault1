// src/components/BookSummaryCard/BookSummaryCard.jsx
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaComment, FaStar } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import './BookSummaryCard.css';

/**
 * BookSummaryCard (Content Feed)
 * - Uses ONLY `description` for preview text
 * - No fallback to full summary (performance + SEO)
 *
 * Small-screen image focal/cropping fix:
 * - On image load we read the naturalWidth/naturalHeight
 * - Decide an object-position (top center, center center) for small screens
 * - Apply inline style to the <img> so cropping shows the best part
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
    difficulty_level = null,
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

  const renderDifficultyBadge = (lvl) => {
    if (!lvl) return null;
    const text = String(lvl);
    const cls = `difficulty-badge difficulty-${text.toLowerCase().replace(/\s+/g, '-')}`;
    return (
      <span
        className={cls}
        title={text}
        aria-hidden="false"
        role="note"
      >
        {text}
      </span>
    );
  };

  // --- image focal control state ---
  const [imgObjectPosition, setImgObjectPosition] = useState('center center');

  // determine the best object-position based on natural image ratio & viewport
  const handleImageLoad = useCallback((e) => {
    try {
      const img = e.target;
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      const ratio = w / h; // width / height
      const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1024;

      // heuristics:
      // - on small screens (mobile), for tall images prefer 'top center' so the top of the cover (title/face) remains visible
      // - for wide images, center center is fine
      // - for almost square images, center center
      //
      // tweak thresholds as you see fit
      if (vw <= 640) {
        if (h > w) {
          // portrait/tall image -> show top area on mobile
          setImgObjectPosition('center top');
        } else if (ratio < 0.9) {
          // very tall (rare) -> top
          setImgObjectPosition('center top');
        } else {
          // landscape-ish -> center
          setImgObjectPosition('center center');
        }
      } else {
        // larger screens -> keep center (desktop already looked fine)
        setImgObjectPosition('center center');
      }
    } catch (err) {
      // fallback
      setImgObjectPosition('center center');
    }
  }, []);

  // optional: if image fails to load, keep center
  const handleImageError = useCallback(() => {
    setImgObjectPosition('center center');
  }, []);

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
          style={{ height: '100%' }} // ensures article fills the li wrapper height
        >
          {image_url ? (
            <div className="cover-wrap">
              <div className="difficulty-overlay">
                {renderDifficultyBadge(difficulty_level)}
              </div>

              <img
                src={image_url}
                alt={`Cover of ${title}`}
                className="book-cover-image"
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
                // apply inline objectPosition so small screens show the "right" crop
                style={{ objectPosition: imgObjectPosition }}
              />
            </div>
          ) : (
            <div className="cover-placeholder" aria-hidden="true">
              <div className="difficulty-overlay">
                {renderDifficultyBadge(difficulty_level)}
              </div>
            </div>
          )}

          <div className="card-content">
            <h3 className="book-title">{title}</h3>

            <p className="book-author">
              by <span>{author}</span>
            </p>

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
