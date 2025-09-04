import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import UserProfileModal from '../UserProfile/UserProfile'; // modal popup
import './Header.css';

const Header = ({ session, onAddClick, onSearch }) => {
  const [profile, setProfile] = useState(null);
  const [q, setQ] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!session) { setProfile(null); return; }
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.warn('Profile fetch error', error);
        setProfile({ username: null });
      } else if (data) {
        setProfile(data);
      } else {
        setProfile({ username: null });
      }
    };

    fetchProfile();
    return () => { mounted = false; };
  }, [session]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (typeof onSearch === 'function') onSearch(q);
    setShowSearch(false);
  };

  const avatarLetter = (profile?.username || session?.user?.email || 'U')[0]?.toUpperCase() || 'U';

  // called by modal when profile is updated
  const handleProfileUpdated = (updatedProfile) => {
    setProfile((p) => ({ ...(p || {}), ...updatedProfile }));
  };

  return (
    <>
      <header className="og-header" role="banner">
        <div className="og-header-left">
          <Link to="/" className="og-logo" aria-label="Go to home">
            <div className="og-logo-mark" aria-hidden>O</div>
            <div className="og-logo-text">OGONJO <span style={{ fontWeight: 400 }}>Summaries</span></div>
          </Link>

          <form
            onSubmit={submitSearch}
            className={`og-search ${showSearch ? 'og-search--visible' : ''}`}
            role="search"
            aria-label="Search summaries"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search summaries, author..."
              aria-label="Search summaries"
            />
          </form>
        </div>

        <div className="og-header-right">
          <button
            className="icon-btn search-toggle"
            aria-label={showSearch ? 'Close search' : 'Open search'}
            onClick={() => setShowSearch((s) => !s)}
            title="Search"
          >
            🔍
          </button>

          <button className="create-button" onClick={onAddClick}>+ Add Summary</button>

          {session ? (
            <>
              <button
                className="profile-button"
                onClick={() => setShowProfileModal(true)}
                aria-haspopup="dialog"
                aria-expanded={showProfileModal}
                title="Open profile"
              >
                <span className="letter-avatar" aria-hidden>{avatarLetter}</span>
                <span className="profile-name">{profile?.username || 'Profile'}</span>
              </button>

              <button
                className="logout-button"
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/auth" className="sign-in-link">Sign In</Link>
          )}
        </div>
      </header>

      {showProfileModal && session && (
        <UserProfileModal
          onClose={() => setShowProfileModal(false)}
          onUpdated={handleProfileUpdated}
        />
      )}
    </>
  );
};

export default Header;
