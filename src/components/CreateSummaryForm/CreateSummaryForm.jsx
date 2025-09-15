// src/components/CreateSummaryForm/CreateSummaryForm.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import ReactQuill from 'react-quill';
import 'quill/dist/quill.snow.css';
import slugify from 'slugify'; // New import for slug generation

import './CreateSummaryForm.css';

// src/components/CreateSummaryForm/CreateSummaryForm.jsx

const categories = [
  'Retail & E-Commerce',
  'Food & Beverage',
  'Health & Wellness',
  'Sustainability & Eco-Friendly',
  'Personal Services',
  'Construction & Renovation',
  'Transportation & Logistics',
  'Entertainment & Recreation',
  'Beauty & Personal Care',
  'Technology & Innovation',
  'Sports & Recreation',
  'Real Estate & Property Management',
  'Arts & Crafts',
  'Event Planning & Management',
  'Agriculture & Farming',
  'Cleaning & Maintenance',
  'Transportation & Delivery',
  'Technology & Electronics',
  'Pets & Animal Services',
  'Professional Services',
  'Home Services',
  'Fashion & Apparel',
  'Technology Services',
  'Tourism & Travel',
  'Fitness & Sports',
  'Education & Training',
  'Media & Publishing',
  'Home Improvement & Repair',
  'Wellness & Personal Care',
  'Automotive Services',
  'Construction & Contracting',
  'Health & Medical Services',
  'Outdoor & Adventure',
  'Entertainment & Leisure',
  'Agriculture & Gardening',
  'Specialty Retail',
  'Environmental & Green Businesses',
  'Miscellaneous Ideas',
  'Community & Social Services',
  'Sports & Fitness',
  'Specialized Repair & Maintenance',
  'Food & Beverage Production',
  'Transportation Enhancements',
];


const CreateSummaryForm = ({ onClose, onNewSummary }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState(''); // New state for the generated slug
  const [author, setAuthor] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from title whenever title changes
  useEffect(() => {
    if (title.trim()) {
      const generatedSlug = slugify(title, { lower: true, strict: true }); // e.g., "The Great Gatsby" -> "the-great-gatsby"
      setSlug(generatedSlug);
    } else {
      setSlug('');
    }
  }, [title]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required.');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to create a summary.');
      setLoading(false);
      return;
    }

    let finalSlug = slug;

    // Check for existing slug and append counter if duplicate
    const { data: existing, error: checkError } = await supabase
      .from('book_summaries')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle(); // Use maybeSingle to handle no rows gracefully

    if (checkError) {
      console.error('Error checking slug:', checkError);
      // Fall back to original slug if check fails
    } else if (existing) {
      // Duplicate found; append -2, -3, etc.
      let counter = 2;
      while (true) {
        const candidateSlug = `${slug}-${counter}`;
        const { data: slugExists } = await supabase
          .from('book_summaries')
          .select('id')
          .eq('slug', candidateSlug)
          .maybeSingle();
        if (!slugExists) {
          finalSlug = candidateSlug;
          break;
        }
        counter++;
      }
    }

    const { error } = await supabase
      .from('book_summaries')
      .insert([
        { 
          title,
          author,
          summary: summaryText, // HTML from Quill
          category,
          user_id: user.id,
          image_url: imageUrl,
          affiliate_link: affiliateLink,
          slug: finalSlug // Insert the final slug
        },
      ]);

    setLoading(false);

    if (error) {
      alert(`Error creating summary: ${error.message}. Please try again.`);
      console.error('Error:', error);
    } else {
      alert(`Summary created successfully! Suggested URL: https://ogonjo.com/summary/${finalSlug}`);
      // Reset form if needed
      setTitle('');
      setAuthor('');
      setSummaryText('');
      setCategory(categories[0]);
      setImageUrl('');
      setAffiliateLink('');
      setSlug('');
      onNewSummary();
      onClose();
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Create a New Summary</h2>
        <form onSubmit={handleSubmit} className="summary-form">
          
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {slug && (
            <small className="slug-preview">
              Generated URL slug: <code>/summary/{slug}</code> (will be: https://ogonjo.com/summary/{slug})
            </small>
          )}

          <label htmlFor="author">Author</label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />

          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label htmlFor="summaryText">Summary</label>
          <ReactQuill
            id="summaryText"
            value={summaryText}
            onChange={setSummaryText}
            modules={quillModules}
            theme="snow"
          />

          <label htmlFor="imageUrl">Book Cover Image URL</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="e.g., https://example.com/cover.jpg"
          />

          <label htmlFor="affiliateLink">Affiliate Link</label>
          <input
            id="affiliateLink"
            type="url"
            value={affiliateLink}
            onChange={(e) => setAffiliateLink(e.target.value)}
            placeholder="e.g., https://amazon.com/book123"
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Summary'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateSummaryForm;