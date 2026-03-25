// src/components/Ad/Ad.jsx
import React, { useEffect, useRef } from 'react';
import './Ad.css';

/**
 * AdSlot — renders a single Google AdSense unit inside a fixed frame.
 * The frame has a fixed min-height so the page layout never jumps.
 *
 * Props:
 *   slot      — AdSense ad-slot ID (string)
 *   index     — position number, used for labelling (1-based)
 *   format    — AdSense format, default 'auto'
 *   className — extra class names
 */
const AdSlot = ({ slot = '1234567890', index = 1, format = 'auto', className = '' }) => {
  const insRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {
      // AdSense not ready yet — silently fail
    }
  }, []);

  return (
    <div className={`ad-frame ${className}`} aria-label={`Advertisement ${index}`} role="complementary">
      <div className="ad-frame__label">Advertisement</div>
      <div className="ad-frame__inner">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-7769353221684341"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default AdSlot;