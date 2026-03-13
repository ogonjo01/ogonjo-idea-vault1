// src/components/SubscriptionPopup/SubscriptionPopup.jsx
import React, { useState, useEffect, useRef } from 'react';
import './SubscriptionPopup.css';

/**
 * Wanda Briefs toast notification.
 *
 * Timing:
 *   10s  — delay after new session starts (nothing visible)
 *   2s   — slides up into view
 *   10s  — visible, green progress bar counts down
 *   2s   — slides back down and fades out
 *
 * Props:
 *   onClose      — called when fully dismissed
 *   onReadBriefs — called when user clicks "Read Briefs"
 */
const SubscriptionPopup = ({ onClose, onReadBriefs }) => {
  const [state, setState] = useState('idle'); // idle | entering | visible | exiting
  const timer = useRef(null);

  const go = (next, ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(next), ms);
  };

  useEffect(() => {
    go('entering', 10000); // 10s delay
    return () => clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (state === 'entering') go('visible', 2000); // 2s slide in
    if (state === 'visible')  go('exiting', 10000); // 10s countdown
    if (state === 'exiting')  go('done',    2000);  // 2s slide out
  }, [state]);

  useEffect(() => {
    if (state === 'done') {
      sessionStorage.setItem('briefPopupDismissed', '1');
      onClose();
    }
  }, [state]);

  const dismiss = () => {
    if (!['entering', 'visible'].includes(state)) return;
    clearTimeout(timer.current);
    setState('exiting');
    setTimeout(() => {
      sessionStorage.setItem('briefPopupDismissed', '1');
      onClose();
    }, 2000);
  };

  const handleReadBriefs = () => {
    sessionStorage.setItem('briefPopupDismissed', '1');
    if (typeof onReadBriefs === 'function') onReadBriefs();
    onClose();
  };

  if (state === 'idle' || state === 'done') return null;

  return (
    <div className={`wb-toast wb-toast--${state}`}>
      {/* Green glow ring — fires once on entry */}
      <div className="wb-glow" />

      {/* Pulse dot */}
      <span className="wb-dot" />

      {/* Text */}
      <p className="wb-text">
        Stay updated with what's happening globally —{' '}
        <span className="wb-highlight">turn today's news into your next move.</span>
      </p>

      {/* CTA */}
      <button className="wb-cta" onClick={handleReadBriefs}>
        Read Briefs
      </button>

      {/* Dismiss X */}
      <button className="wb-close" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>

      {/* Progress bar — only animates during visible phase */}
      <div className={`wb-progress ${state === 'visible' ? 'wb-progress--active' : ''}`} />
    </div>
  );
};

export default SubscriptionPopup;