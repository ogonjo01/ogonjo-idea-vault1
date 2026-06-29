// src/components/BookSummaryCard/BookSummaryCard.jsx
import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaComment, FaStar } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import './BookSummaryCard.css';

const DEFAULT_PREVIEW_LENGTH = 120;

const cleanAndTruncate = (text, maxLength = DEFAULT_PREVIEW_LENGTH) => {
  if (!text) return '';
  const cleaned = DOMPurify.sanitize(String(text), { ALLOWED_TAGS: [] });
  const stripped = cleaned.replace(/<[^>]*>/g, '').trim();
  return stripped.length > maxLength ? `${stripped.substring(0, maxLength)}…` : stripped;
};

const getTitleFontSize = (title = '') => {
  const len = String(title).trim().length;
  if (len <= 20) return '1.05rem';
  if (len <= 40) return '0.92rem';
  if (len <= 70) return '0.82rem';
  return '0.74rem';
};

const BookSummaryCard = ({ summary = {}, onEdit, onDelete }) => {
  const {
    title = 'Untitled',
    author = 'Unknown',
    description = '',
    id,
    slug,
    likes_count = 0,
    views_count = 0,
    comments_count = 0,
    image_url = '',
    avg_rating = 0,
    difficulty_level = null,
  } = summary || {};

  const summaryPath = useMemo(() => (slug ? `/library/${slug}` : `/library/${id}`), [slug, id]);

  const previewText = useMemo(() => {
    return description && String(description).trim()
      ? cleanAndTruncate(description, DEFAULT_PREVIEW_LENGTH)
      : '';
  }, [description]);

  const renderDifficultyBadge = useCallback((lvl) => {
    if (!lvl) return null;
    const text = String(lvl);
    return (
      <span
        className={`difficulty-badge difficulty-${text.toLowerCase().replace(/\s+/g, '-')}`}
        title={text}
        role="note"
      >
        {text}
      </span>
    );
  }, []);

  const [imgObjectPosition, setImgObjectPosition] = useState('center center');

  const handleImageLoad = useCallback((e) => {
    try {
      const img = e.target;
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      const ratio = w / h;
      const vw = window.innerWidth || 1024;
      if (vw <= 640 && (h > w || ratio < 0.9)) {
        setImgObjectPosition('center top');
      } else {
        setImgObjectPosition('center center');
      }
    } catch {
      setImgObjectPosition('center center');
    }
  }, []);

  const handleImageError = useCallback(() => setImgObjectPosition('center center'), []);

  const titleFontSize = getTitleFontSize(title);

  return (
    <li
      className="summary-card-wrapper"
      role="listitem"
      data-post-id={id}
      data-post-slug={slug || ''}
    >
      <Link to={summaryPath} className="card-link" aria-label={`Read ${title}`}>
        <motion.article
          className="summary-card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          {/* ── Cover image with title overlay ── */}
          <div className="cover-wrap">
            <div className="difficulty-overlay">
              {renderDifficultyBadge(difficulty_level)}
            </div>

            {image_url ? (
              <img
                src={image_url}
                alt={`Cover of ${title}`}
                className="book-cover-image"
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ objectPosition: imgObjectPosition }}
                decoding="async"
                draggable={false}
              />
            ) : (
              <div className="cover-placeholder-bg" aria-hidden="true" />
            )}

            {/* Title centered on the image */}
            <div className="cover-title-overlay">
              <h3 className="cover-title" style={{ fontSize: titleFontSize }}>
                {title}
              </h3>
            </div>
          </div>

          {/* ── Card body below image ── */}
          <div className="card-content">

            {/* Title repeated below image in green — like before */}
            <h3 className="book-title">{title}</h3>

            <p className="book-author">
              by <span>{author}</span>
            </p>

            {previewText ? (
              <p className="summary-text">{previewText}</p>
            ) : (
              <div className="summary-text" aria-hidden="true" />
            )}

            <footer className="card-footer" aria-hidden="true">
              <div className="engagement-item" title={`${likes_count || 0} likes`}>
                <FaHeart className="footer-icon" />
                <span className="eng-count">{likes_count || 0}</span>
              </div>
              <div className="engagement-item" title={`${comments_count || 0} comments`}>
                <FaComment className="footer-icon" />
                <span className="eng-count">{comments_count || 0}</span>
              </div>
              <div className="engagement-item" title={`${views_count || 0} views`}>
                <FaEye className="footer-icon" />
                <span className="eng-count">{views_count || 0}</span>
              </div>
              <div className="engagement-item rating" title={`Rating ${avg_rating ? Number(avg_rating).toFixed(1) : '0.0'}`}>
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