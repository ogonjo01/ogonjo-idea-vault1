// src/components/Ad/Ad.jsx
// ─────────────────────────────────────────────────────────────────────────────
// AdSlot — renders either:
//   A) A workbook recommendation card  (when `workbook` prop is provided)
//   B) The original Ezoic/AdSense ad   (when no `workbook` prop — unchanged fallback)
//
// The outer .ad-frame dimensions are UNTOUCHED so layout is unaffected.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Ad.css';

// ── Rotating slot labels — each slot gets a different one ────────────────────
const SLOT_LABELS = [
  'Recommended for you',
  'You might also find useful',
  'From the ONJO Library',
  'Related to what you\'re reading',
  'Readers also explored',
  'Expand your knowledge',
  'Curated for this topic',
];

const getLabel = (slotIndex) => SLOT_LABELS[(slotIndex - 1) % SLOT_LABELS.length];

// ── Parse affiliate link (same logic as SummaryView header) ─────────────────
const parseAffiliate = (raw) => {
  if (!raw) return null;
  try {
    if (typeof raw === 'object' && raw !== null) {
      const url = String(raw.url || raw.link || '').trim();
      if (!url) return null;
      const type = (raw.type || 'book').toLowerCase();
      return { url, label: type === 'pdf' ? 'Get PDF' : type === 'app' ? 'Open App' : 'Get Book' };
    }
    if (typeof raw === 'string') {
      const parts = raw.split('|', 2).map(p => p.trim());
      if (parts.length === 2 && parts[1]) {
        const type = parts[0].toLowerCase();
        return { url: parts[1], label: type === 'pdf' ? 'Get PDF' : type === 'app' ? 'Open App' : 'Get Book' };
      }
      if (raw.trim()) return { url: raw.trim(), label: 'Get Book' };
    }
  } catch (e) {}
  return null;
};

// ── Workbook recommendation card ─────────────────────────────────────────────
const WorkbookSlot = ({ workbook, slotIndex }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const affiliate = workbook.affiliateParsed || parseAffiliate(workbook.affiliate_link);
  const label = getLabel(slotIndex);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleViewDetails = (e) => {
    e.preventDefault();
    const dest = workbook.slug
      ? `/summary/${workbook.slug}`
      : `/summary/${workbook.id}`;
    navigate(dest);
  };

  return (
    <div className={`wb-slot ${visible ? 'wb-slot--visible' : ''}`} role="complementary" aria-label={label}>
      {/* Top label bar */}
      <div className="wb-slot__label-bar">
        <span className="wb-slot__dot" aria-hidden="true" />
        <span className="wb-slot__label">{label}</span>
      </div>

      {/* Card body */}
      <div className="wb-slot__body">
        {/* Thumbnail */}
        {workbook.image_url && (
          <div className="wb-slot__thumb" aria-hidden="true">
            <img src={workbook.image_url} alt="" loading="lazy" />
          </div>
        )}

        {/* Text */}
        <div className="wb-slot__text">
          <div className="wb-slot__title" title={workbook.title}>
            {workbook.title}
          </div>
          {workbook.description && (
            <div className="wb-slot__desc">
              {String(workbook.description).slice(0, 160)}{workbook.description.length > 160 ? '…' : ''}
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="wb-slot__ctas">
          <button
            type="button"
            className="wb-slot__cta wb-slot__cta--primary"
            onClick={handleViewDetails}
            aria-label={`View details for ${workbook.title}`}
          >
            View Details
          </button>
          {affiliate?.url && (
            <a
              className="wb-slot__cta wb-slot__cta--secondary"
              href={affiliate.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${affiliate.label} — ${workbook.title}`}
            >
              {affiliate.label} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main AdSlot component ─────────────────────────────────────────────────────
const AdSlot = ({ index = 1, workbook = null, className = '' }) => {
  const adsensePushed = useRef(false);

  // Only run Ezoic/AdSense logic when there is no workbook
  useEffect(() => {
    if (workbook) return;
    if (!adsensePushed.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adsensePushed.current = true;
      } catch (e) {}
    }
  }, [workbook]);

  // ── Render workbook recommendation ────────────────────────────────────────
  if (workbook) {
    return (
      <div className={`ad-frame ad-frame--workbook ${className}`}>
        <WorkbookSlot workbook={workbook} slotIndex={index} />
      </div>
    );
  }

  // ── Render original ad (unchanged) ────────────────────────────────────────
  return (
    <div
      className={`ad-frame ${className}`}
      aria-label={`Advertisement ${index}`}
      role="complementary"
    >
      <span className="ad-frame__label">Advertisement</span>
      <div className="ad-frame__inner">
        <div id={`ezoic-pub-ad-placeholder-${index}`} />
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