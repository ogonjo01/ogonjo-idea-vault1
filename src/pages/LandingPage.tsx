
// ogonjo-web-app/src/pages/LandingPage.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      const { data: books, error: bookError } = await supabase
        .from('audible_books')
        .select('id, title, author, image_url, audible_affiliate_link')
        .order('created_at', { ascending: false })
        .limit(3);
      if (bookError) console.error('Error fetching books:', bookError);
      else setFeaturedItems(books || []);
    };
    fetchFeaturedContent();
  }, []);

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-overlay">
          <h1 className="hero-title">Welcome to Ogonjo: Unlock Your Potential</h1>
          <p className="hero-subtitle">Explore a world of innovations, learning, summaries, wisdom, and audio books.</p>
          <Link to="/ideas" className="hero-button">Start Exploring</Link>
        </div>
      </section>
      <section className="featured-section">
        <h2 className="section-title">Featured Highlights</h2>
        <div className="featured-grid">
          <div className="featured-card">
            <h3>Innovations</h3>
            <p>Discover groundbreaking ideas to inspire your next project.</p>
            <Link to="/ideas" className="featured-link">Explore Innovations</Link>
          </div>
          <div className="featured-card">
            <h3>Learning</h3>
            <p>Master new skills with our curated courses.</p>
            <Link to="/courses" className="featured-link">Start Learning</Link>
          </div>
          <div className="featured-card">
            <h3>Summaries</h3>
            <p>Get concise insights from top books.</p>
            <Link to="/book-summaries" className="featured-link">View Summaries</Link>
          </div>
          <div className="featured-card">
            <h3>Wisdom</h3>
            <p>Find motivational quotes to guide your journey.</p>
            <Link to="/quotes" className="featured-link">Discover Wisdom</Link>
          </div>
          <div className="featured-card">
            <h3>Audio Books</h3>
            <p>Listen to captivating stories and knowledge.</p>
            <Link to="/insights" className="featured-link">Listen Now</Link>
          </div>
        </div>
      </section>
      <section className="audio-section">
        <h2 className="section-title">Featured Audio Books</h2>
        <div className="audio-carousel">
          {featuredItems.map((item) => (
            <div key={item.id} className="audio-item">
              <img src={item.image_url || 'https://via.placeholder.com/150x200'} alt={item.title} className="audio-image" />
              <h3 className="audio-title">{item.title}</h3>
              <p className="audio-author">by {item.author}</p>
              <button className="audio-button" onClick={() => window.open(item.audible_affiliate_link, '_blank')}>Listen</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
