// src/components/Ad/Ad.jsx
import React from 'react';
import './Ad.css';

const AdSlot = ({ index = 101, className = '' }) => {
  return (
    <div
      className={`ad-frame ${className}`}
      aria-label={`Advertisement ${index}`}
      role="complementary"
    >
      <span className="ad-frame__label">Advertisement</span>
      {/* No styling on this div — Ezoic requirement */}
      <div id={`ezoic-pub-ad-placeholder-${index}`} />
    </div>
  );
};

export default AdSlot;