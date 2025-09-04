// src/components/CategoryFilter/CategoryFilter.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabaseClient';
import './CategoryFilter.css';

const CategoryFilter = ({ selectedCategory = 'For You', onSelectCategory }) => {
  const [categories, setCategories] = useState(['For You']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('book_summaries')
          .select('category')
          .not('category', 'is', null)
          .limit(200);

        if (error) {
          console.error('Error fetching categories', error);
          if (mounted) setLoading(false);
          return;
        }

        const unique = Array.from(
          new Set(
            (data || [])
              .map((d) => (d.category || '').toString().trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (mounted) {
          setCategories(['For You', ...unique]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Fetch categories failed', err);
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => { mounted = false; };
  }, []);

  // keyboard helper so Enter/Space on a focused button triggers selection
  const handleKey = (e, category) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (typeof onSelectCategory === 'function') onSelectCategory(category);
    }
  };

  return (
    <nav
      className="category-filter-container"
      role="navigation"
      aria-label="Categories"
    >
      {loading ? (
        <div className="category-loading" aria-live="polite">Loading categories…</div>
      ) : (
        categories.map((c) => (
          <motion.button
            key={c}
            type="button"
            data-category={c}
            className={`category-item ${selectedCategory === c ? 'active' : ''}`}
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
