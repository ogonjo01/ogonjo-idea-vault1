// src/components/SubscriptionPopup/SubscriptionPopup.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import './SubscriptionPopup.css';

/**
 * BriefPopup — promotes the Ogonjo Briefs tab.
 * Dismisses for the current session only (sessionStorage).
 * Returns on every new session — no email, no form.
 *
 * Props:
 *   onClose        — called when user dismisses
 *   onReadBriefs   — called when user clicks "Read The Brief"
 *                    (parent should switch to '📰 Ogonjo Briefs' tab)
 */
const SubscriptionPopup = ({ onClose, onReadBriefs }) => {

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleClose = () => {
    // Dismiss for this session only
    sessionStorage.setItem('briefPopupDismissed', '1');
    onClose();
  };

  const handleReadBriefs = () => {
    sessionStorage.setItem('briefPopupDismissed', '1');
    onClose();
    if (typeof onReadBriefs === 'function') onReadBriefs();
  };

  return (
    <motion.div
      className="sp-popup-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="sp-popup sp-popup--brief"
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="sp-popup-close"
          onClick={handleClose}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>

        <div className="sp-popup-content">
          <div className="sp-brief-badge">📰 Ogonjo Briefs</div>

          <h2 className="sp-popup-title sp-brief-title">
            Business intelligence.<br />For people who act on it.
          </h2>

          <p className="sp-popup-sub">
            Market moves, startup strategies, and actionable insights —
            curated for founders, investors, and builders.
          </p>

          <div className="sp-brief-actions">
            <button
              type="button"
              className="sp-brief-cta"
              onClick={handleReadBriefs}
            >
              Read The Brief
            </button>

            <button
              type="button"
              className="sp-brief-dismiss"
              onClick={handleClose}
            >
              Not interested
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SubscriptionPopup;