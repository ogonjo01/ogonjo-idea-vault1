import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './UserProfile.css';

const UserProfile = ({ onClose, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ username: '' });
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.warn('profile fetch error', error);
        setProfile({ username: '' });
      } else if (data) {
        setProfile(data);
        setInputValue(data.username || '');
      } else {
        setProfile({ username: '' });
        setInputValue('');
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const saveUsername = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('You must be logged in.');
    const newUsername = (inputValue || '').trim();
    if (!newUsername) return alert('Username cannot be empty.');

    setLoading(true);
    // upsert profile row (create if missing)
    const { error, data } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username: newUsername }, { onConflict: 'id' })
      .select()
      .maybeSingle();

    setLoading(false);
    if (error) {
      console.error('Update error', error);
      alert('Could not update username.');
      return;
    }
    setProfile(data || { username: newUsername });
    setEditing(false);
    if (typeof onUpdated === 'function') onUpdated({ username: newUsername });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="User profile">
      <div className="modal-panel">
        <button className="modal-close" onClick={onClose} aria-label="Close profile">&times;</button>

        <div className="profile-modal-body">
          <div className="profile-modal-avatar">
            <span className="letter-avatar-large">{(profile.username || 'U')[0]?.toUpperCase() || 'U'}</span>
          </div>

          <div className="profile-modal-info">
            <h2 className="profile-modal-name">{profile.username || 'User'}</h2>

            {!editing ? (
              <>
                <div className="profile-modal-actions">
                  <button className="btn" onClick={() => { setEditing(true); setInputValue(profile.username || ''); }}>Edit Username</button>
                  <button className="btn btn-outline" onClick={onClose}>Close</button>
                </div>
              </>
            ) : (
              <>
                <label className="sr-only" htmlFor="username-input">Username</label>
                <input
                  id="username-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter username"
                />
                <div className="profile-modal-actions">
                  <button className="btn" onClick={saveUsername} disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
                  <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
