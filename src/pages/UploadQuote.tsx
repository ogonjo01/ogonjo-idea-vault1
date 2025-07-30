import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../services/supabase';
import { Theme } from '../constants/Theme';
import './UploadQuote.css';

// Predefined categories (matching QuotesScreen)
const QUOTE_CATEGORIES = [
  { name: 'Leadership', description: 'Inspiring vision, leading teams, setting direction' },
  { name: 'Entrepreneurship & Risk', description: 'Courage, starting up, resilience' },
  { name: 'Innovation & Creativity', description: 'Thinking differently, disrupting the norm' },
  { name: 'Success & Motivation', description: 'Hard work, goals, perseverance' },
  { name: 'Failure & Learning', description: 'Growth mindset, learning from mistakes' },
  { name: 'Money & Finance', description: 'Wealth, investing, value creation' },
  { name: 'Strategy & Vision', description: 'Planning, foresight, competitive advantage' },
  { name: 'Marketing & Branding', description: 'Customer focus, storytelling, market fit' },
  { name: 'Productivity & Time Management', description: 'Efficiency, habits, execution' },
  { name: 'Teamwork & Culture', description: 'Collaboration, trust, workplace values' },
];

const UploadQuote: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    quote_text: '',
    author: '',
    category: QUOTE_CATEGORIES[0]?.name || '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => prev.filter(err => !err.toLowerCase().includes(field.replace('_', ' ').toLowerCase())));
    setGeneralError(null);
  };

  const togglePicker = () => {
    setIsPickerOpen(prev => !prev);
  };

  const handlePickerSelect = (value: string) => {
    handleInputChange('category', value);
    setIsPickerOpen(false);
  };

  const handleSubmit = useCallback(async () => {
    if (authLoading || !user) {
      alert('Authentication Required: Please log in to upload a quote.');
      navigate('/auth');
      return;
    }

    const errors: string[] = [];
    if (!formData.quote_text.trim()) errors.push('Quote text is required.');
    if (!formData.author.trim()) errors.push('Author is required.');
    if (!formData.category.trim()) errors.push('Category is required.');

    if (errors.length > 0) {
      setFormErrors(errors);
      setGeneralError(null);
      alert('Missing Information\n' + errors.join('\n'));
      return;
    }

    setIsUploading(true);
    setFormErrors([]);
    setGeneralError(null);

    try {
      const { error: insertError } = await supabase
        .from('business_quotes')
        .insert({
          quote_text: formData.quote_text.trim(),
          author: formData.author.trim(),
          category: formData.category.trim(),
          user_id: user.id,
          status: 'pending',
        });

      if (insertError) throw insertError;

      alert('Upload Successful! Your quote has been uploaded successfully.');
      navigate('/quotes');
      setFormData({ quote_text: '', author: '', category: QUOTE_CATEGORIES[0]?.name || '' });
    } catch (err: any) {
      console.error('🔥 [UploadQuote] Caught exception:', err);
      setGeneralError(err.message || 'An unexpected error occurred during quote submission.');
      alert('Submission Failed\n' + (err.message || 'There was an error submitting your quote. Please try again.'));
    } finally {
      setIsUploading(false);
    }
  }, [user, authLoading, formData, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-prompt-container">
        <p>Please log in to upload quotes.</p>
        <button className="login-button" onClick={() => navigate('/auth')}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="upload-quote-container">
      <h1>Upload New Quote</h1>
      <p className="subtitle">Share your favorite business wisdom</p>

      {generalError && (
        <div className="error-box">
          <p className="error-text">{generalError}</p>
        </div>
      )}
      {formErrors.length > 0 && (
        <div className="error-box">
          {formErrors.map((err, index) => (
            <p key={index} className="error-text">• {err}</p>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Quote Details</h2>

        <div className="input-group">
          <label>
            <i className="fas fa-quote-left"></i> Quote Text <span className="required-indicator">*</span>
          </label>
          <textarea
            placeholder="e.g., The only way to do great work is to love what you do."
            value={formData.quote_text}
            onChange={(e) => handleInputChange('quote_text', e.target.value)}
            required
            disabled={isUploading}
          />
        </div>

        <div className="input-group">
          <label>
            <i className="fas fa-user"></i> Author <span className="required-indicator">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Steve Jobs"
            value={formData.author}
            onChange={(e) => handleInputChange('author', e.target.value)}
            required
            disabled={isUploading}
          />
        </div>

        <div className="input-group" ref={categoryRef}>
          <label>
            <i className="fas fa-th"></i> Category <span className="required-indicator">*</span>
          </label>
          <div className="picker-display" onClick={togglePicker}>
            <input
              type="text"
              value={formData.category || 'Select a category'}
              readOnly
            />
            <i className="fas fa-chevron-down"></i>
          </div>
          {isPickerOpen && (
            <div className="picker-container">
              {QUOTE_CATEGORIES.map((option, index) => (
                <div
                  key={index}
                  className="picker-item"
                  onClick={() => handlePickerSelect(option.name)}
                >
                  {option.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        className={`submit-button ${isUploading ? 'disabled' : ''}`}
        onClick={handleSubmit}
        disabled={isUploading}
      >
        {isUploading ? (
          <span>
            <i className="fas fa-spinner fa-spin"></i> Uploading...
          </span>
        ) : (
          'Submit Quote'
        )}
      </button>
    </div>
  );
};

export default UploadQuote;