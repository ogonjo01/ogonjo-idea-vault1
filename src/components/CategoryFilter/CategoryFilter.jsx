// src/components/CategoryFilter/CategoryFilter.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabaseClient';
import './CategoryFilter.css';

const CategoryFilter = ({
  selectedCategory = 'For You',
  onSelectCategory,
  isHomePage,
  isHidden,
  onRoleLoaded,
}) => {
  const [categories, setCategories] = useState(['For You']);
  const [loading, setLoading]       = useState(true);
  const [userRole, setUserRole]     = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      try {
        // 1. Get current user role
        const { data: { user } = {} } = await supabase.auth.getUser();
        let role = 'user';
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          role = profile?.role || 'user';
        }
        if (mounted) {
          setUserRole(role);
          if (typeof onRoleLoaded === 'function') onRoleLoaded(role);
        }

        // 2. FIXED: fetch all rows, deduplicate in JS — no {distinct:true} option
        const { data, error } = await supabase
          .from('book_summaries')
          .select('category')
          .not('category', 'is', null)
          .limit(10000);

        if (error) throw error;

        const unique = Array.from(
          new Set(
            (data || [])
              .map((d) => (d.category || '').toString().trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (mounted) {
          const draftTab = (role === 'admin' || role === 'team') ? ['📝 Drafts'] : [];
          setCategories([...draftTab, 'For You', ...unique]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Fetch categories failed', err);
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { mounted = false; };
  }, [onRoleLoaded]);

  const handleKey = (e, category) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (typeof onSelectCategory === 'function') onSelectCategory(category);
    }
  };

  const containerClassName = [
    'category-filter-container',
    !isHomePage ? 'category-filter-container--scrollable' : '',
    isHidden    ? 'category-filter-container--hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <nav className={containerClassName} role="navigation" aria-label="Categories">
      {loading ? (
        <div className="category-loading" aria-live="polite">Loading categories…</div>
      ) : (
        categories.map((c) => (
          <motion.button
            key={c}
            type="button"
            data-category={c}
            className={`category-item ${selectedCategory === c ? 'active' : ''} ${c === '📝 Drafts' ? 'category-item--drafts' : ''}`}
            onClick={() => typeof onSelectCategory === 'function' && onSelectCategory(c)}
            onKeyDown={(e) => handleKey(e, c)}
            whileHover={{ scale: 1.03 }}
            aria-pressed={selectedCategory === c}
            title={`Show ${c}`}
          >
            {c}
          </motion.button>
        ))
      )}
    </nav>
  );
};

export default CategoryFilter;