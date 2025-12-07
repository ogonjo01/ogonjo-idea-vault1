// src/pages/About.jsx
import React from 'react';

/* Mock Header component for self-contained demo (replace with your Header) */
const Header = () => (
  <header style={{ padding: '1rem 1.25rem', backgroundColor: '#0f3d2e', color: '#fff' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h1 style={{ margin: 0, fontSize: 20, fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: 1 }}>OGONJO</h1>
      <nav aria-label="Main navigation">
        <a href="/" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', marginLeft: 18, fontSize: 14 }}>Home</a>
        <a href="/explore" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', marginLeft: 14, fontSize: 14 }}>Explore</a>
        <a href="/about" style={{ color: 'rgba(255,255,255,0.96)', textDecoration: 'underline', marginLeft: 14, fontSize: 14 }}>About</a>
      </nav>
    </div>
  </header>
);

/* Mock Footer component for self-contained demo (replace with your Footer) */
const Footer = () => (
  <footer style={{ padding: '2rem 1.25rem', backgroundColor: '#f4f6f5', color: '#0f3d2e', marginTop: 48 }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 14 }}>© {new Date().getFullYear()} OGONJO. All rights reserved.</p>
    </div>
  </footer>
);

const About = () => {
  return (
    <div className="about-shell">
      <style>{`
        /* ---------- Color tokens (Option A - Executive Green) ---------- */
        :root {
          --accent-dark: #0f3d2e;
          --accent-mid:  #1d5f46;
          --accent-soft: #2b7a63;
          --muted: #6b7a76;
          --bg: #fafbf9;
          --card: #ffffff;
          --glass: rgba(15,61,46,0.06);
          --max-width: 1200px;
          --radius: 12px;
          --focus: 3px solid rgba(43,122,99,0.14);
        }

        /* ---------- Base layout ---------- */
        .about-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          color: var(--accent-dark);
          font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        main.about-main {
          width: 100%;
          max-width: var(--max-width);
          margin: 36px auto;
          padding: 24px;
          box-sizing: border-box;
        }

        /* ---------- Hero ---------- */
        .about-hero {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 28px;
          align-items: center;
          background: linear-gradient(180deg, rgba(15,61,46,0.03), rgba(15,61,46,0.01));
          border-radius: var(--radius);
          padding: 28px;
          box-shadow: 0 8px 30px rgba(12, 40, 34, 0.06);
          overflow: hidden;
        }

        .hero-copy h2 {
          margin: 0 0 10px 0;
          font-size: 28px;
          line-height: 1.05;
          color: var(--accent-dark);
          font-weight: 700;
          letter-spacing: -0.2px;
        }

        .hero-copy p.lead {
          margin: 0 0 18px 0;
          color: var(--muted);
          font-size: 16px;
          line-height: 1.6;
          max-width: 72ch;
        }

        .hero-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-primary {
          background: linear-gradient(90deg, var(--accent-mid), var(--accent-soft));
          color: #fff;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(43,122,99,0.12);
        }
        .btn-primary:hover { transform: translateY(-2px); }

        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(15,61,46,0.08);
          color: var(--accent-dark);
          padding: 9px 14px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-ghost:focus { outline: var(--focus); }

        .hero-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.85));
          border: 1px solid rgba(15,61,46,0.04);
          min-height: 180px;
        }

        .hero-visual img {
          width: 100%;
          height: auto;
          max-width: 320px;
          display: block;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(12,40,34,0.06);
        }

        /* ---------- Grid content ---------- */
        .about-grid {
          margin-top: 28px;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 24px;
        }

        /* left column content cards */
        .card {
          background: var(--card);
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(10,20,18,0.04);
        }

        .card h3 {
          margin-top: 0;
          color: var(--accent-dark);
          font-size: 20px;
        }

        .card p {
          color: #4a5a57;
          line-height: 1.7;
          margin-bottom: 12px;
        }

        /* quick stats */
        .stats {
          display: flex;
          gap: 12px;
          margin-top: 6px;
        }
        .stat {
          flex: 1;
          background: linear-gradient(180deg, rgba(15,61,46,0.02), rgba(15,61,46,0.01));
          padding: 14px;
          border-radius: 10px;
          text-align: center;
        }
        .stat .num {
          font-size: 20px;
          font-weight: 700;
          color: var(--accent-mid);
        }
        .stat .label {
          font-size: 13px;
          color: var(--muted);
          margin-top: 6px;
        }

        /* right column: aside / values / CTA */
        aside.side {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .values {
          padding: 14px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(15,61,46,0.02), rgba(15,61,46,0.01));
          border: 1px solid rgba(15,61,46,0.03);
        }

        .values h4 { margin: 0 0 8px 0; color: var(--accent-dark); font-size: 16px; }
        .value-item { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
        .value-bullet {
          min-width: 10px;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          background: var(--accent-mid);
          margin-top: 6px;
          box-shadow: 0 2px 8px rgba(43,122,99,0.12);
        }
        .value-text { font-size: 14px; color: #40514f; line-height: 1.45; }

        /* team row (compact) */
        .team-mini { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
        .team-card {
          display: flex;
          gap: 12px;
          align-items: center;
          background: #fff;
          padding: 10px;
          border-radius: 8px;
        }
        .team-photo { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; border: 2px solid rgba(15,61,46,0.06); }
        .team-meta { font-size: 13px; }
        .team-meta .name { font-weight: 700; color: var(--accent-dark); }
        .team-meta .role { color: var(--muted); font-size: 12px; }

        /* footer CTA card */
        .cta-card {
          margin-top: 18px;
          background: linear-gradient(90deg, rgba(43,122,99,0.06), rgba(15,61,46,0.02));
          padding: 18px;
          border-radius: 12px;
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }
        .cta-left { max-width: 72%; }
        .cta-left h4 { margin: 0; color: var(--accent-dark); }
        .cta-left p { margin: 6px 0 0 0; color: var(--muted); font-size: 14px; }

        /* ---------- Responsive ---------- */
        @media (max-width: 980px) {
          .about-hero, .about-grid { grid-template-columns: 1fr; }
          .hero-visual { order: -1; }
          .about-grid { gap: 18px; }
        }

        @media (max-width: 520px) {
          .hero-copy h2 { font-size: 22px; }
          .hero-copy p.lead { font-size: 15px; }
          .team-mini { grid-template-columns: 1fr; }
        }
      `}</style>

      <Header />

      <main className="about-main" role="main">
        {/* HERO */}
        <section className="about-hero" aria-labelledby="about-hero-title">
          <div className="hero-copy">
            <h2 id="about-hero-title">Behind every business is a dream. We help you build it.</h2>
            <p className="lead">
              OGONJO provides entrepreneurs with trusted, distilled business knowledge — summaries, tools, and practical frameworks
              that save founders time and help them make better decisions. Our content is concise, actionable, and focused on outcomes.
            </p>

            <div className="hero-actions" role="group" aria-label="Hero actions">
              <a href="/explore" className="btn-primary" style={{ textDecoration: 'none' }}>Explore summaries</a>
              <a href="/create" className="btn-ghost" style={{ textDecoration: 'none' }}>Contribute</a>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="stats" role="list" aria-label="Quick stats">
                <div className="stat" role="listitem">
                  <div className="num">~12k</div>
                  <div className="label">Readers monthly</div>
                </div>
                <div className="stat" role="listitem">
                  <div className="num">4.8/5</div>
                  <div className="label">Average rating</div>
                </div>
                <div className="stat" role="listitem">
                  <div className="num">Free</div>
                  <div className="label">No paywalls</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            {/* illustrative visual — replace with an SVG or image that suits your brand */}
            <img src="https://placehold.co/600x360/e8f5f0/0f3d2e?text=OGONJO+Insights" alt="OGONJO platform preview" />
          </div>
        </section>

        {/* GRID: Left content + Aside */}
        <div className="about-grid">
          <div>
            <article className="card" aria-labelledby="why-title">
              <h3 id="why-title">Why OGONJO exists</h3>
              <p>
                Founders are drowning in long-form material while time is short. OGONJO's mission is to reduce this friction.
                We extract high-signal ideas from the world's best business literature, and present them in a format founders can act on — fast.
              </p>
              <p>
                Our approach is evidence-based and product-first: every summary is written to highlight the problem, the core idea, and
                the specific actions you can take today. We never substitute nuance for speed — instead, we deliver clarity and pathways
                to learn more when you want depth.
              </p>
            </article>

            <article className="card" aria-labelledby="how-title" style={{ marginTop: 16 }}>
              <h3 id="how-title">How it works</h3>
              <p>
                We combine human curation with lightweight editorial processes:
              </p>
              <ul style={{ marginTop: 8, paddingLeft: 18, color: '#3f5b57' }}>
                <li><strong>Curate:</strong> We select books and resources with a strong track record in business and leadership.</li>
                <li><strong>Distill:</strong> Summaries focus on the problem, the framework, and practical steps for creators.</li>
                <li><strong>Validate:</strong> Community feedback, ratings, and usage metrics inform improvements.</li>
              </ul>
            </article>

            <article className="card" aria-labelledby="impact-title" style={{ marginTop: 16 }}>
              <h3 id="impact-title">Impact & governance</h3>
              <p>
                We prioritize open access and community governance. Contributors retain credit; our editorial team ensures quality and
                reduces bias. We also partner with educators and incubators to bring summaries into real-world learning environments.
              </p>
            </article>
          </div>

          <aside className="side" aria-labelledby="aside-title">
            <div className="values card values" role="region" aria-labelledby="values-title">
              <h4 id="values-title">Core values</h4>

              <div className="value-item">
                <span className="value-bullet" aria-hidden="true" />
                <div className="value-text"><strong>Practicality</strong> — we prioritize actionable insight and next steps for founders.</div>
              </div>

              <div className="value-item">
                <span className="value-bullet" aria-hidden="true" />
                <div className="value-text"><strong>Accessibility</strong> — free content, readable formats, and low friction discovery.</div>
              </div>

              <div className="value-item">
                <span className="value-bullet" aria-hidden="true" />
                <div className="value-text"><strong>Rigour</strong> — accurate summaries, transparent sources, and editorial oversight.</div>
              </div>

              <div className="value-item">
                <span className="value-bullet" aria-hidden="true" />
                <div className="value-text"><strong>Community</strong> — we grow through contributions, feedback, and shared learning.</div>
              </div>
            </div>

            <div className="card" aria-labelledby="team-brief">
              <h4 id="team-brief" style={{ marginBottom: 8 }}>Leadership</h4>
              <div className="team-mini">
                <div className="team-card">
                  <img className="team-photo" src="https://placehold.co/200x200/cccccc/333333?text=JD" alt="John Doe" />
                  <div className="team-meta">
                    <div className="name">John Doe</div>
                    <div className="role">Founder & CEO</div>
                  </div>
                </div>

                <div className="team-card">
                  <img className="team-photo" src="https://placehold.co/200x200/cccccc/333333?text=JS" alt="Jane Smith" />
                  <div className="team-meta">
                    <div className="name">Jane Smith</div>
                    <div className="role">Head of Content</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <a href="/team" className="btn-ghost" style={{ textDecoration: 'none' }}>Meet the full team</a>
              </div>
            </div>

            <div className="cta-card" role="region" aria-labelledby="cta-title">
              <div className="cta-left">
                <h4 id="cta-title" style={{ margin: 0 }}>Get started in minutes</h4>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Browse curated summaries or contribute your own. Join a community of builders.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="/explore" className="btn-primary" style={{ textDecoration: 'none' }}>Explore</a>
                <a href="/signup" className="btn-ghost" style={{ textDecoration: 'none' }}>Create account</a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
