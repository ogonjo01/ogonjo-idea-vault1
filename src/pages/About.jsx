import React from 'react';

// Mock Header component to make the page self-contained
const Header = () => (
  <header style={{ padding: '1rem', backgroundColor: '#34495e', color: '#fff', textAlign: 'center' }}>
    <h1 style={{ margin: 0 }}>OGONJO</h1>
  </header>
);

// Mock Footer component to make the page self-contained
const Footer = () => (
  <footer style={{ padding: '2rem', backgroundColor: '#2c3e50', color: '#fff', textAlign: 'center' }}>
    <p>© 2025 OGONJO. All rights reserved.</p>
  </footer>
);

const About = () => {
  return (
    <div className="about-page-container">
      <style>
        {`
          /* --- General Page Layout --- */
          .about-page-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background-color: #f8f8f8;
            font-family: 'Roboto', sans-serif;
            color: #34495e;
          }
          
          .main-content {
            flex: 1;
            padding: 4rem 1.5rem;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }
          
          /* --- Hero Section --- */
          .about-hero-section {
            text-align: center;
            margin-bottom: 4rem;
            padding: 2rem 0;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          
          .about-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 3rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 0.5rem;
          }
          
          .about-subtitle {
            font-size: 1.25rem;
            color: #7f8c8d;
          }
          
          /* --- Content Sections --- */
          .about-content-section {
            display: flex;
            flex-direction: column;
            gap: 3rem;
          }
          
          .content-block {
            background-color: #ffffff;
            padding: 2.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          
          .content-heading {
            font-family: 'Montserrat', sans-serif;
            font-size: 2rem;
            font-weight: 600;
            color: #34495e;
            margin-bottom: 1.5rem;
            text-align: center;
          }
          
          .content-paragraph {
            font-size: 1rem;
            line-height: 1.8;
            color: #555;
            margin-bottom: 1.5rem;
          }
          
          /* --- Values Section --- */
          .values-list {
            list-style: none;
            padding: 0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            text-align: left;
          }
          
          .values-list li {
            background-color: #ecf0f1;
            padding: 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            line-height: 1.6;
            border-left: 4px solid #3498db;
          }
          
          .value-name {
            font-weight: bold;
            color: #2c3e50;
            display: block;
            margin-bottom: 0.5rem;
          }
          
          /* --- Team Section --- */
          .team-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 2rem;
            margin-top: 2rem;
          }
          
          .team-member {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 250px;
          }
          
          .team-photo {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #3498db;
            margin-bottom: 1rem;
          }
          
          .member-name {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: #2c3e50;
            margin: 0.5rem 0;
          }
          
          .member-role {
            font-style: italic;
            color: #7f8c8d;
            margin-bottom: 1rem;
          }
          
          .member-bio {
            font-size: 0.9rem;
            color: #555;
            line-height: 1.6;
          }
          
          /* --- Responsive adjustments --- */
          @media (max-width: 768px) {
            .main-content {
              padding: 2rem 1rem;
            }
            
            .about-title {
              font-size: 2.25rem;
            }
          
            .content-heading {
              font-size: 1.75rem;
            }
          }
        `}
      </style>
      <Header />
      <main className="main-content">
        <section className="about-hero-section">
          <h1 className="about-title">Our Mission</h1>
          <p className="about-subtitle">
            Empowering entrepreneurs with the knowledge to build and scale.
          </p>
        </section>

        <section className="about-content-section">
          <div className="content-block">
            <h2 className="content-heading">Why We Built This Platform</h2>
            <p className="content-paragraph">
              In the fast-paced world of startups, time is a founder's most valuable resource. We created this platform to cut through the noise and provide a direct path to the most critical insights from the world's best business books. Our goal is to democratize knowledge, making proven strategies for business, leadership, and personal growth accessible to everyone, completely free of charge.
            </p>
            <p className="content-paragraph">
              We believe that the barrier to entry for great ideas should be as low as possible. By providing concise, text-based summaries, we enable you to absorb essential information quickly, allowing you to focus on what matters most: building your business.
            </p>
          </div>

          <div className="content-block values-section">
            <h2 className="content-heading">Our Values</h2>
            <ul className="values-list">
              <li>
                <span className="value-name">Accessibility:</span> Knowledge should be free and accessible to all.
              </li>
              <li>
                <span className="value-name">Efficiency:</span> We value your time by delivering actionable insights in minutes.
              </li>
              <li>
                <span className="value-name">Growth:</span> We are dedicated to providing content that helps you learn and grow.
              </li>
              <li>
                <span className="value-name">Integrity:</span> We curate and summarize content with the highest standards of quality and accuracy.
              </li>
            </ul>
          </div>

          <div className="content-block team-section">
            <h2 className="content-heading">Meet Our Team</h2>
            <div className="team-grid">
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=John+Doe" 
                  alt="John Doe" 
                  className="team-photo"
                />
                <h3 className="member-name">John Doe</h3>
                <p className="member-role">Founder & CEO</p>
                <p className="member-bio">A serial entrepreneur with a passion for innovation and a deep belief in the power of shared knowledge.</p>
              </div>
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=Jane+Smith" 
                  alt="Jane Smith" 
                  className="team-photo"
                />
                <h3 className="member-name">Jane Smith</h3>
                <p className="member-role">Head of Content</p>
                <p className="member-bio">A seasoned writer and researcher dedicated to distilling complex topics into clear, understandable summaries.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
