
// src/pages/Onboarding.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Onboarding.css';

function Onboarding() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  const completeOnboarding = () => {
    setProgress(100); // Simulate progress
    setTimeout(() => {
      localStorage.setItem('onboardingComplete', 'true');
      navigate('/auth');
    }, 500); // Slight delay for animation
  };

  useEffect(() => {
    // Auto-increment progress for gamification feel
    if (progress < 100) {
      const timer = setInterval(() => setProgress(prev => Math.min(prev + 10, 100)), 300);
      return () => clearInterval(timer);
    }
  }, [progress]);

  return (
    <div className="onboarding-container">
      <div className="onboarding-hero">
        <h1>Welcome to Ogonjo, Your Idea Playground!</h1>
        <p className="hero-tagline">Ready to unlock your potential? Let’s embark on this journey together!</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <button className="level-up-btn" onClick={completeOnboarding}>
          Level Up to Explorer! 🚀
        </button>
      </div>
      <div className="onboarding-features">
        <div className="feature-card">
          <span className="feature-icon">💡</span>
          <h3>Unlock 10,000+ Ideas</h3>
          <p>Discover a world of inspiration tailored just for you!</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📈</span>
          <h3>Boost Your Business</h3>
          <p>Tools to grow your success, step by step.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🎧</span>
          <h3>Dive into Audiobooks</h3>
          <p>Learn on the go with our curated collection!</p>
        </div>
      </div>
      <div className="onboarding-badge">
        <p>Earn your <strong>Explorer Badge</strong> by starting now!</p>
      </div>
    </div>
  );
}

export default Onboarding;
