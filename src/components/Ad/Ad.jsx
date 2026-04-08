// src/components/Ad/Ad.jsx
import React, { useEffect } from 'react';
import './Ad.css';

const AdSlot = ({ index = 1, className = '' }) => {
  useEffect(() => {
    try {
      window.ezstandalone = window.ezstandalone || {};
      ezstandalone.cmd = ezstandalone.cmd || [];
      ezstandalone.cmd.push(function () {
        ezstandalone.displayMore(index);
      });
    } catch (e) {}
  }, [index]);

  return (
    <div
      className={`ad-frame ${className}`}
      aria-label={`Advertisement ${index}`}
      role="complementary"
    >
      <span className="ad-frame__label">Advertisement</span>
      <div className="ad-frame__inner">
        <div id={`ezoic-pub-ad-placeholder-${index}`} />
      </div>
    </div>
  );
};

export default AdSlot;