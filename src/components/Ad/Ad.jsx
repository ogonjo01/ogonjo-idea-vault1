// src/components/Ad/Ad.jsx
import React, { useEffect, useRef } from 'react';
import './Ad.css';

const AdSlot = ({ index = 101, className = '' }) => {
  const adsensePushed = useRef(false);

  useEffect(() => {
    // AdSense fallback
    if (!adsensePushed.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adsensePushed.current = true;
      } catch (e) {}
    }
  }, []);

  return (
    <div
      className={`ad-frame ${className}`}
      aria-label={`Advertisement ${index}`}
      role="complementary"
    >
      <span className="ad-frame__label">Advertisement</span>
      <div className="ad-frame__inner">
        {/* Ezoic placeholder */}
        <div id={`ezoic-pub-ad-placeholder-${index}`} />

        {/* AdSense fallback — shows while Ezoic is pending approval */}
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-7769353221684341"
          data-ad-slot="6281602467"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default AdSlot;