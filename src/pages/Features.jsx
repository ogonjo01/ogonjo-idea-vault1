import React from 'react';

const App = () => {
  const features = [
    {
      title: "Actionable Insights",
      description: "We distill complex frameworks and strategies from leading business books into concise, actionable insights. Get straight to the core lessons you need to apply to your business today.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor"><path d="M544 0H32C14.33 0 0 14.33 0 32v448c0 17.67 14.33 32 32 32h512c17.67 0 32-14.33 32-32V32c0-17.67-14.33-32-32-32zM368 416H208v-32h160v32zm0-64H208v-32h160v32zM192 144H64v-64h128v64zm192 0H224v-64h160v64zm128 0H416v-64h96v64zm-128 128H224v-64h160v64zm128 0H416v-64h96v64z"/></svg>,
    },
    {
      title: "Foundational Strategies",
      description: "Explore summaries focused on product-market fit, fundraising, and scalable business models. Our curated content helps you build a solid and resilient foundation for your startup's success.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M256 80c-8.84 0-16 7.16-16 16v160c0 8.84 7.16 16 16 16s16-7.16 16-16V96c0-8.84-7.16-16-16-16zM464 256c0-114.69-93.31-208-208-208S48 141.31 48 256s93.31 208 208 208 208-93.31 208-208zM256 416c-88.37 0-160-71.63-160-160s71.63-160 160-160 160 71.63 160 160-71.63 160-160 160z"/></svg>,
    },
    {
      title: "Growth & Scaling Playbooks",
      description: "Master the art of sustainable growth. Our summaries cover key topics like digital marketing, customer acquisition, and operational efficiency, empowering you to scale your business effectively.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M256 48c-114.7 0-208 93.3-208 208s93.3 208 208 208 208-93.3 208-208S370.7 48 256 48zm0 384c-97 0-176-79-176-176S159 80 256 80s176 79 176 176-79 176-176 176z"/></svg>,
    },
    {
      title: "Mastering Leadership",
      description: "Leadership is a skill, not a title. Our content provides actionable advice on building high-performing teams, fostering a strong company culture, and making difficult decisions with confidence.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 480c-123.7 0-224-100.3-224-224S132.3 32 256 32s224 100.3 224 224-100.3 224-224 224z"/></svg>,
    },
    {
      title: "Strategic Curation",
      description: "Our library is carefully selected to include only the most impactful books for founders. We prioritize quality over quantity, ensuring you get the most relevant knowledge for your entrepreneurial journey.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32zm0 416c-105.9 0-192-86.1-192-192S150.1 64 256 64s192 86.1 192 192-86.1 192-192 192z"/></svg>,
    },
  ];

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">OGONJO</h1>
      </header>

      <div className="category-bar">
        <p>Mock Category Bar</p>
      </div>

      <main className="main-content">
        <section className="hero-section">
          <h1 className="hero-title">Unlock Your Business Potential.</h1>
          <p className="hero-description">
            Access free, high-quality summaries from the best business and startup books. Our platform is designed to help you save time and gain a competitive edge by getting straight to the core, actionable knowledge.
          </p>
        </section>

        <section className="features-grid-section">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2025 OGONJO. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
