// src/components/Ad/Ad.jsx
import React, { useEffect, useRef } from 'react';
import './Ad.css';

const AdSlot = ({ slot = '1234567890', index = 1, className = '' }) => {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {}
  }, []);

  return (
    <div className={`ad-frame ${className}`} aria-label={`Advertisement ${index}`} role="complementary">
      <span className="ad-frame__label">Advertisement</span>
      <div className="ad-frame__inner">
        <ins
          className="adsbygoogle"
          data-ad-client="ca-pub-7769353221684341"
          data-ad-slot={slot}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
};

export default AdSlot;