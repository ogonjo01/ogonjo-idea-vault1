// src/components/FeedOnboarding/FeedOnboarding.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './FeedOnboarding.css';

export const ONBOARDING_KEY = 'ogonjo_onboarding';
export const ONBOARDING_SKIPPED_KEY = 'ogonjo_onboarding_skipped';

const CATEGORIES = [
  'Business Strategy & Systems','Career Development','Case Studies',
  'Digital Skills & Technology','Entrepreneurship','Finance & Funding',
  'Frameworks & Models','Global & Emerging Markets','How To',
  'Leadership & Management','Marketing & Sales','Mindset & Motivation',
  'Money & Productivity','Operations & Systems','Self-Improvement',
  'Strategic Communication','Tools & Software','Video Insights',
  'Workbooks','Best Books','Book Summaries','Business Ideas',
];

const FeedOnboarding = ({ onComplete }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [popularTags, setPopularTags] = useState([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);

  // Fetch the 100 most-used tags from the actual database
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data } = await supabase
          .from('book_summaries')
          .select('tags')
          .eq('status', 'published')
          .limit(5000);

        const tagCounts = {};
        (data || []).forEach(row => {
          (row.tags || []).forEach(tag => {
            const key = tag.toLowerCase().trim();
            tagCounts[key] = (tagCounts[key] || 0) + 1;
          });
        });

        const sorted = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 100)
          .map(([tag]) => tag);

        setPopularTags(sorted);
        setTagsLoaded(true);
      } catch {
        setTagsLoaded(true); // fallback
      }
    };
    fetchTags();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return CATEGORIES;
    const q = searchTerm.toLowerCase();
    return CATEGORIES.filter(c => c.toLowerCase().includes(q));
  }, [searchTerm]);

  const filteredTags = useMemo(() => {
    if (!searchTerm.trim()) return popularTags;
    const q = searchTerm.toLowerCase();
    return popularTags.filter(t => t.toLowerCase().includes(q));
  }, [searchTerm, popularTags]);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleFinish = () => {
    const weights = {};
    selectedCategories.forEach(c => {
      weights[c.toLowerCase().trim()] = 0.6;
    });
    selectedTags.forEach(t => {
      weights[t.toLowerCase().trim()] = 0.5;
    });

    localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
      topics: [...selectedCategories, ...selectedTags],
      weights,
      completedAt: Date.now(),
    }));

    // Safety: ensure onComplete exists and is callable
    if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  const totalSelected = selectedCategories.length + selectedTags.length;

  if (!tagsLoaded) {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-modal">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading topics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h2>Personalise Your Feed</h2>
          <p>Pick at least 3 topics or categories you're interested in.</p>
        </div>

        {/* Search bar */}
        <div className="onboarding-search">
          <input
            type="text"
            placeholder="Search interests…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="onboarding-search-input"
          />
        </div>

        {/* Scrollable content area */}
        <div className="onboarding-body">
          <div className="onboarding-section">
            <h3 className="onboarding-section-title">Categories</h3>
            <div className="onboarding-chips">
              {filteredCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`onboarding-chip${selectedCategories.includes(cat) ? ' active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="onboarding-section">
            <h3 className="onboarding-section-title">Popular Topics</h3>
            <div className="onboarding-chips">
              {filteredTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`onboarding-chip${selectedTags.includes(tag) ? ' active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer – always visible */}
        <div className="onboarding-footer">
          <button
            className="onboarding-submit"
            disabled={totalSelected < 3}
            onClick={handleFinish}
          >
            {totalSelected < 3
              ? `Choose ${3 - totalSelected} more`
              : 'Continue to Feed'}
          </button>
          <button className="onboarding-skip" onClick={handleSkip}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedOnboarding;