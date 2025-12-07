import React, { useState, useEffect } from "react";
import { Mail, Check, Star, X } from "lucide-react";
import { motion } from "framer-motion";
import './SubscriptionPopup.css';

const SubscriptionPopup = ({ onClose }) => {
  const [email, setEmail] = useState("");

  // Close popup on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleClose = () => {
    localStorage.setItem('popupDismissedAt', Date.now());
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || email.indexOf('@') === -1) {
      alert('Please enter a valid email.');
      return;
    }

    // Optionally store email locally for analytics or UX
    localStorage.setItem('popupEmail', email);

    // Redirect to Gumroad subscription page
    window.open("https://onjo.gumroad.com", "_blank");

    // Auto-close popup
    handleClose();
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
        className="sp-popup"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sp-popup-close" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="sp-popup-content">
          <h2 className="sp-popup-title">Unlock Business Potential in 10s</h2>
          <p className="sp-popup-sub">Get curated book summaries, startup playbooks, and actionable insights weekly—free!</p>

          <ul className="sp-popup-benefits">
            <li><Check size={16} /> Actionable insights from top books</li>
            <li><Check size={16} /> Foundational strategies for PMF & fundraising</li>
            <li><Check size={16} /> Growth playbooks with templates</li>
            <li><Check size={16} /> Leadership tips for teams & culture</li>
            <li><Check size={16} /> Strategic curation for founders</li>
          </ul>

          <form onSubmit={handleSubmit} className="sp-popup-form">
            <div className="sp-popup-input-group">
              <Mail size={18} className="sp-popup-icon" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="sp-popup-input"
              />
            </div>

            <button type="submit" className="sp-popup-submit">
              Get Free Insights
            </button>
          </form>

          <div className="sp-popup-testimonial">
            <Star size={16} className="sp-popup-star" />
            <p>“Hit 2x MRR in 3 months with these playbooks!” — Maya, Founder</p>
          </div>

          <p className="sp-popup-legal">No spam • Unsubscribe anytime</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SubscriptionPopup;
