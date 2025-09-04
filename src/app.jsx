// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase/supabaseClient';

import Header from './components/Header/Header';
import CategoryFilter from './components/CategoryFilter/CategoryFilter';
import ContentFeed from './components/ContentFeed/ContentFeed';
import AddSummaryForm from './components/CreateSummaryForm/CreateSummaryForm';
import AuthForm from './components/AuthForm/AuthForm';
import UserProfile from './components/UserProfile/UserProfile';
import SummaryView from './components/SummaryView/SummaryView';
import ExplorePage from './components/ExplorePage/ExplorePage';
import ScrollHideManager from './components/ScrollHideManager/ScrollHideManager';
import './App.css';

const AppInner = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // read category from ?category=...; fallback to 'For You'
  const getCategoryFromSearch = useCallback(() => {
    const qs = new URLSearchParams(location.search);
    const cat = qs.get('category');
    return cat ? cat : 'For You';
  }, [location.search]);

  const [selectedCategory, setSelectedCategory] = useState(getCategoryFromSearch());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);

  // keep selectedCategory synced with URL (back/forward / direct links)
  useEffect(() => {
    setSelectedCategory(getCategoryFromSearch());
  }, [location.search, getCategoryFromSearch]);

  // handle session changes coming from parent (if you need to keep setSession here, you can)
  useEffect(() => {
    // keep homepage layout class in sync for header/category padding
    if (location.pathname === '/') {
      document.body.classList.add('homepage-fixed');
    } else {
      document.body.classList.remove('homepage-fixed');
    }
  }, [location.pathname]);

  // delegated click handler: elements across the app can add data-category="Name"
  useEffect(() => {
    const onDocClick = (e) => {
      const el = e.target.closest('[data-category]');
      if (!el) return;
      const category = el.getAttribute('data-category');
      if (!category) return;
      e.preventDefault();
      handleNavClick(category);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* no deps: we use stable handler below */]);

  // centralized nav handler: state + URL
  const handleNavClick = useCallback((category) => {
    const cat = category || 'For You';
    setSelectedCategory(cat);
    setSearchQuery('');
    // push new URL so back/forward and sharing works
    navigate(`/?category=${encodeURIComponent(cat)}`, { replace: false });
  }, [navigate]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSelectedCategory('');
    // optionally reflect search in url for bookmarking
    const qs = query ? `?q=${encodeURIComponent(query)}` : '/';
    navigate(`/` + (query ? `?q=${encodeURIComponent(query)}` : ''), { replace: false });
  }, [navigate]);

  const handleEdit = (summary) => {
    setEditingSummary(summary);
    setShowAddForm(true);
  };

  const handleDelete = (summaryId) => {
    console.log(`Summary with ID ${summaryId} deleted.`);
    // prefer optimistic state update; for now reload
    window.location.reload();
  };

  return (
    <>
      <ScrollHideManager />
      <Header session={session} onAddClick={() => setShowAddForm(true)} onSearch={handleSearch} />
      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={handleNavClick} />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <ContentFeed
                selectedCategory={selectedCategory}
                searchQuery={searchQuery}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelectCategory={handleNavClick} // pass down so ContentFeed can navigate when user taps category headings
              />
            }
          />
          <Route path="/auth" element={!session ? <AuthForm /> : <p className="logged-in-message">You are already logged in!</p>} />
          <Route path="/profile/:userId" element={<UserProfile onEdit={handleEdit} onDelete={handleDelete} />} />
          <Route path="/summary/:id" element={<SummaryView />} />
          <Route path="/explore" element={<ExplorePage />} />
        </Routes>

        {showAddForm && (
          <AddSummaryForm
            onClose={() => {
              setShowAddForm(false);
              setEditingSummary(null);
            }}
            summaryToEdit={editingSummary}
          />
        )}
      </main>
    </>
  );
};

const App = () => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <AppInner session={session} />
      </div>
    </Router>
  );
};

export default App;
