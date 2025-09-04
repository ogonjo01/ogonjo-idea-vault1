// src/components/CreateSummaryForm/CreateSummaryForm.jsx

import React, { useState } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CreateSummaryForm.css';

const categories = [
  'Literary Fiction',
  'Mystery / Crime / Thriller',
  'Fantasy',
  'Science Fiction',
  'Romance',
  'Historical Fiction',
  'Horror & Supernatural',
  'Adventure & Action',
  'Dystopian & Speculative',
  'Young Adult (YA) Fiction',
  'Children’s Fiction',
  'Short Stories & Anthologies',
  'Biography & Memoir',
  'History & Politics',
  'Self-Help & Personal Development',
  'Business, Economics & Finance',
  'Science & Technology',
  'Psychology & Human Behavior',
  'Philosophy & Religion',
  'Health, Wellness & Fitness',
  'Education & Reference',
  'Travel & Adventure Writing',
  'True Crime & Investigative',
  'Poetry & Drama',
  'Comics, Manga & Graphic Novels',
];

const CreateSummaryForm = ({ onClose, onNewSummary }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to create a summary.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('book_summaries')
      .insert([
        { 
          title,
          author,
          summary: summaryText, // now HTML from Quill
          category,
          user_id: user.id,
          image_url: imageUrl,
          affiliate_link: affiliateLink
        },
      ]);

    setLoading(false);

    if (error) {
      alert('Error creating summary. Please try again.');
      console.error('Error:', error);
    } else {
      alert('Summary created successfully!');
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
