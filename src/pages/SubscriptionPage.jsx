import React, { useState } from "react";
import { Mail, Check, Star } from "lucide-react";
import { motion } from "framer-motion";
import './SubscriptionPage.css';

export default function SubscriptionPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!email || email.indexOf('@') === -1) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('https://ogonjo-idea-vault1-production.up.railway.app/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      });

      let data = null;
      try { data = await response.json(); } catch (err) { /* ignore non-json */ }

      if (response.ok) {
        setMessage('🎉 You are all set! Check your inbox to confirm.');
        setEmail('');
      } else {
        setError('Oops! ' + (data && data.message ? data.message : 'Something went wrong. Please try again.'));
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError('An error occurred. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-root">
      <main className="sp-container">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="sp-hero"
        >
          <div className="sp-hero-left">
            <span className="sp-pill"><Check size={14} /> Curated for founders</span>

            <h1 className="sp-title">Book summaries, startup playbooks — delivered weekly.</h1>

            <p className="sp-sub">Actionable takeaways, step-by-step growth plans, and investor-ready one-pagers — built to save you time and help you ship faster.</p>

            <div className="sp-cta-row">
              <a href="#subscribe" className="sp-cta-primary"><Mail size={16} /> Subscribe free</a>
              <a href="#features" className="sp-cta-ghost">See what's inside</a>
            </div>

            <ul className="sp-benefits">
              <li><strong>10-minute summaries</strong><span>High-signal takeaways you can action today.</span></li>
              <li><strong>Startup playbooks</strong><span>Hiring, growth experiments, fundraising — templates included.</span></li>
            </ul>
          </div>

          <motion.aside
            id="subscribe"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
            className="sp-card"
          >
            <div className="sp-card-head">
              <div>
                <h3 className="sp-card-title">Join 10,000+ builders</h3>
                <p className="sp-card-sub">Weekly newsletter + exclusive guides</p>
              </div>
              <div className="sp-muted">No spam • Unsubscribe anytime</div>
            </div>

            <form onSubmit={submit} className="sp-form" aria-label="Subscribe form">
              <label className="sp-label" htmlFor="email">Email</label>
              <div className="sp-field-row">
                <input
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sp-input"
                  placeholder="you@company.com"
                  type="email"
                />

                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="sp-select"
                  aria-label="Subscription tier"
                >
                  <option value="monthly">Weekly (free)</option>
                  <option value="pro">Pro — $9/mo</option>
                </select>
              </div>

              {error && <p className="sp-error">{error}</p>}
              {message && <p className="sp-success">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="sp-submit"
              >
                {loading ? 'Subscribing…' : 'Get insights in your inbox'}
              </button>

              <p className="sp-legal">By subscribing, you agree to receive emails. We respect your privacy.</p>
            </form>

            <div className="sp-grid-2">
              <div className="sp-mini"> 
                <Star size={16} />
                <div>
                  <div className="mini-title">Newsletter</div>
                  <div className="mini-sub">Curated book takeaways</div>
                </div>
              </div>

              <div className="sp-mini">
                <Check size={16} />
                <div>
                  <div className="mini-title">Playbooks</div>
                  <div className="mini-sub">Step-by-step guides</div>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.header>

        <section id="features" className="sp-section">
          <h2 className="sp-h2">Why subscribe?</h2>
          <p className="sp-p">We craft high-signal, actionable summaries that strip away the fluff. Expect practical experiments, investor one-pagers, and checklists to help you move faster.</p>

          <div className="sp-feature-grid">
            <article className="sp-feature">
              <h4>Actionable Templates</h4>
              <p>PRDs, hiring scorecards, growth experiments — ready to use.</p>
            </article>

            <article className="sp-feature">
              <h4>Weekly Digest</h4>
              <p>Top insights from the best business books — short and structured.</p>
            </article>

            <article className="sp-feature">
              <h4>Exclusive Deep-Dives</h4>
              <p>Subscriber-only guides that walk you through execution.</p>
            </article>
          </div>
        </section>

        <section className="sp-section sp-reviews">
          <div>
            <h2 className="sp-h2">Testimonials</h2>
            <blockquote className="sp-quote">“The weekly playbooks helped us hit 2x MRR in 3 months.”<cite>— Maya, Founder</cite></blockquote>
            <blockquote className="sp-quote">“Concise, practical and perfect for busy PMs.”<cite>— Jules, Product</cite></blockquote>
          </div>

          <div>
            <h2 className="sp-h2">FAQ</h2>
            <div className="sp-faq">
              <details>
                <summary>Is the weekly newsletter free?</summary>
                <div>Yes — the standard weekly digest is free. Pro plan unlocks deep dives and templates.</div>
              </details>

              <details>
                <summary>How often will I receive emails?</summary>
                <div>Weekly digest + occasional product or growth experiments (2–4 emails/month).</div>
              </details>
            </div>
          </div>
        </section>

        <footer className="sp-footer">© {new Date().getFullYear()} Ogonjo Idea Vault • Built for builders & founders</footer>
      </main>
    </div>
  );
}


