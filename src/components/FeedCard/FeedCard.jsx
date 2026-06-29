// src/components/FeedCard/FeedCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaStar } from 'react-icons/fa';
import './FeedCard.css';

const FeedCard = ({ article }) => {
  const path = article.slug ? `/summary/${article.slug}` : `/summary/${article.id}`;

  return (
    <Link to={path} className="feed-card-link">
      <article className="feed-card">
        {/* Image container */}
        <div className="feed-card-img-wrap">
          {article.image_url ? (
            <img
              src={article.image_url}
              alt={article.title}
              className="feed-card-img"
              loading="lazy"
            />
          ) : (
            <div className="feed-card-img-placeholder" />
          )}
          {/* Title overlay at the bottom of the image */}
          <div className="feed-card-title-overlay">
            <h3 className="feed-card-title">{article.title}</h3>
          </div>
        </div>

        {/* Stats row below the image */}
        <div className="feed-card-stats">
          <span><FaHeart /> {article.likes_count || 0}</span>
          <span><FaEye /> {article.views_count || 0}</span>
          {article.avg_rating > 0 && (
            <span><FaStar style={{ color: '#f1c40f' }} /> {Number(article.avg_rating).toFixed(1)}</span>
          )}
          {article.author && (
            <span className="feed-card-author">{article.author}</span>
          )}
        </div>
      </article>
    </Link>
  );
};

export default FeedCard;